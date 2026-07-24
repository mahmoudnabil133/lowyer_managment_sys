import { Injectable, Logger } from '@nestjs/common';
import {
  ProviderSchedule,
  ProviderScheduleDocument,
  TimeWindow,
} from '../models/provider-schedule.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { SlotStatus, TimeSlot, TimeSlotDocument } from '../models/slot.schema';
import { DateTime } from 'luxon';
@Injectable()
export class SlotGeneratorService {
  private readonly logger = new Logger(SlotGeneratorService.name);
  constructor(
    @InjectModel(ProviderSchedule.name)
    private scheduleModel: Model<ProviderScheduleDocument>,
    @InjectModel(TimeSlot.name) private slotModel: Model<TimeSlotDocument>,
  ) {}

  async generateSlotsForAllProviders(daysAhead = 7): Promise<void> {
    const schedules = await this.scheduleModel.find({ isActive: true });
    // from tomorrow to nextweek
    const from = DateTime.utc().startOf('day').plus({ days: 1 });
    const to = from.plus({ days: daysAhead - 1 });

    for (const schedule of schedules) {
      await this.gerateSlotsForProvider(
        schedule.providerId.toString(),
        from,
        to,
      );
    }
  }
  async gerateSlotsForProvider(
    providerId: string,
    from: DateTime,
    to: DateTime,
  ) {
    // 1. Get the provider's schedule rules
    const schedule = await this.scheduleModel.findOne({
      providerId,
      isActive: true,
    });
    if (!schedule) {
      this.logger.warn(`no active schedule for provider ${providerId}`);
      return { generated: 0, skipped: 0 };
    }
    let generated = 0;
    let skipped = 0;
    let cursor = from.startOf('day'); // ex: 2023-08-01T00:00:00.000Z
    const end = to.startOf('day'); // ex: 2023-08-07T00:00:00.000Z

    while (cursor < end) {
      const dateStr = cursor.toFormat('yyyy-MM-dd'); // ex: 2023-08-01
      if (schedule.blockDates.includes(dateStr)) {
        cursor = cursor.plus({ days: 1 });
        skipped += 1;
        continue;
      }

      const daySchedule = schedule.weeklySchedule.find(
        (d) => d.dayOfWeek === cursor.weekday % 7, //cursor.weekday: 1=Monday, 7=Sunday, DayOfWeek: 0=Sunday, 6=Saturday
      ); // output ex: { dayOfWeek: 2, isWorking: true, windows: [ { startTime: '09:00', endTime: '12:00' }, { startTime: '13:00', endTime: '17:00' } ] }

      // Skip if not a working day or no time windows defined

      if (
        !daySchedule ||
        !daySchedule.isWorking ||
        !daySchedule.windows.length
      ) {
        cursor = cursor.plus({ days: 1 });
        continue;
      }

      const slotsForDay = this.buildSlotsForDay(
        providerId,
        cursor,
        dateStr,
        schedule,
        daySchedule.windows,
      );
      if (slotsForDay.length) {
        const ops = slotsForDay.map((slot) => ({
          updateOne: {
            filter: { providerId: slot.providerId, startTime: slot.startTime },
            update: { $setOnInsert: slot }, // $setOnInsert = only set if inserting
            upsert: true, // Create if doesn't exist
          },
        }));

        const result = await this.slotModel.bulkWrite(ops, { ordered: false });
        generated += result.upsertedCount; // New slots created
        skipped += result.matchedCount; // Already existed
      }

      cursor = cursor.plus({ days: 1 });
    }

    this.logger.log(
      `Provider ${providerId}: generated=${generated}, skipped=${skipped}`,
    );
    return { generated, skipped };
  }

  buildSlotsForDay(
    providerId: string,
    date: DateTime,
    dateStr: string,
    schedule: ProviderSchedule,
    windows: TimeWindow[],
  ): Partial<TimeSlot>[] {
    const slots: Partial<TimeSlot>[] = [];
    const {
      slotDurationMinutes,
      bufferMinutes,
      maxConcurrentAppointments,
      timezone,
    } = schedule;
    const stepMinuts = slotDurationMinutes + bufferMinutes;
    for (const window of windows) {
      const [startH, startM] = window.startTime.split(':').map(Number);
      const [endH, endM] = window.endTime.split(':').map(Number);

      let slotStart = date.setZone(timezone).set({
        hour: startH,
        minute: startM,
        second: 0,
        millisecond: 0,
      });

      const windowEnd = date.setZone(timezone).set({
        hour: endH,
        minute: endM,
        second: 0,
        millisecond: 0,
      });

      while (slotStart.plus({ minutes: slotDurationMinutes }) <= windowEnd) {
        const slotEnd = slotStart.plus({ minutes: slotDurationMinutes });

        slots.push({
          providerId: providerId as any,
          date: dateStr,
          startTime: slotStart.toUTC().toJSDate(), // Store in UTC
          endTime: slotEnd.toUTC().toJSDate(),
          durationMinutes: slotDurationMinutes,
          status: SlotStatus.AVAILABLE,
          appointmentId: null,
          heldExpireDate: null,
          holdBy: null,
          bookedCount: 0,
          maxBookings: maxConcurrentAppointments,
        });
        slotStart = slotStart.plus({ minutes: stepMinuts });
      }
    }
    return slots;
  }
  async releaseExpiredHolds(): Promise<number> {
    const res = await this.slotModel.updateMany(
      { status: SlotStatus.HOLD, heldExpireDate: { $lt: new Date() } },
      {
        $set: {
          status: SlotStatus.AVAILABLE,
          heldExpireDate: null,
          holdBy: null,
          appointmentId: null,
        },
      },
    );
    return res.modifiedCount;
  }
}
