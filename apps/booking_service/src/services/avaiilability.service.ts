import { BadRequestException, ConflictException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SlotStatus, TimeSlot, TimeSlotDocument } from '../models/slot.schema';
import { ClientSession, Model } from 'mongoose';
import { ProviderSchedule, ProviderScheduleDocument, } from '../models/provider-schedule.schema';
import { GetAvailableRangeDto, GetAvailableSlotsDto, HoldSlotDto, } from '../dtos/booking.dto';
import { DateTime } from 'luxon';

const HOLD_DURATION_MINUTES = 10;

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(TimeSlot.name)
    public slotModel: Model<TimeSlotDocument>,
    @InjectModel(ProviderSchedule.name)
    public scheduleModel: Model<ProviderScheduleDocument>,
  ) { }

  // quiry all available slots (may by hold but expired)
  async getAvailableSlots(dto: GetAvailableSlotsDto) {
    const now = new Date();
    const slots = await this.slotModel
      .find({
        providerId: dto.providerId,
        date: dto.date,
        status: { $in: [SlotStatus.AVAILABLE, SlotStatus.HOLD] },
        startTime: { $gt: now },
      })
      .sort({ startTime: 1 })
      .lean();

    return slots.filter((slot) => {
      if (slot.status === SlotStatus.HOLD) {
        return slot.heldExpireDate && slot.heldExpireDate >= now; // so slot is not hold now
      }
      return slot.bookedCount < slot.maxBookings;
    });
  }

  // return a clender style availability(monthly calender where each month has its own available slots)
  async getAvailabilityRange(dto: GetAvailableRangeDto) {
    let now = new Date();
    const from = DateTime.fromISO(dto.fromDate); // converted type to DateTime
    const to = DateTime.fromISO(dto.toDate);
    if (from > to) {
      throw new BadRequestException('toDate must be after fromDate');
    }
    if (to.diff(from, 'days').days > 60) {
      throw new BadRequestException('Date range cannot exceed 60 days');
    }

    const slots = await this.slotModel
      .find({
        providerId: dto.providerId,
        startTime: { $gt: now },
        status: SlotStatus.AVAILABLE,
        date: { $gt: dto.fromDate, $lt: dto.toDate },
        $expr: { $lt: ['$bookedCount', '$maxBookings'] },
      })
      .sort({ startTime: 1 })
      .lean();
    // group slots by date, {date: [slot_12, slot_13, ...]}
    const byDate = new Map<string, typeof slots>();
    for (const slot of slots) {
      if (!byDate.has(slot.date)) byDate.set(slot.date, []);
      byDate.get(slot.date)!.push(slot);
    }
    const result: { date: string; availableCount: number; slots: any[] }[] = [];
    let cursor = from;

    while (cursor <= to) {
      let dateStr = cursor.toFormat('yyyy-MM-dd');
      const dateSlots = byDate.get(dateStr) || [];
      result.push({
        date: dateStr,
        availableCount: dateSlots.length,
        slots: dateSlots,
      });
      cursor = cursor.plus({ days: 1 });
    }
    return result;
  }

  // ─── Hold Management (Prevents Race Conditions) ────────────────────────
  // Prevents double-booking race conditions:
  // Without holds: Patient A and Patient B click "Book" simultaneously on the same slot

  async holdSlot(dto: HoldSlotDto) {
    const now = new Date();
    const holdExpiry = DateTime.utc()
      .plus({ minutes: HOLD_DURATION_MINUTES })
      .toJSDate();

    console.log(dto);



    const slot = await this.slotModel.findOneAndUpdate(
      {
        _id: dto.slotId,
        status: SlotStatus.AVAILABLE,
        startTime: { $gt: now },
        $expr: { $lt: ['$bookedCount', '$maxBookings'] },
      },
      {
        $set: {
          status: SlotStatus.HOLD,
          heldExpireDate: holdExpiry,
          holdBy: dto.patientId,
        },
      },
      { new: true },
    );

    if (!slot) {
      const existing = await this.slotModel.findById(dto.slotId).lean();
      if (!existing) {
        throw new NotFoundException('Slot not found');
      }
      if (existing.status === SlotStatus.BOOKED) {
        throw new ConflictException('Slot is already booked');
      }

      if (existing.status === SlotStatus.HOLD) {
        if (existing.holdBy?.toString() === dto.patientId) {
          return (await this.slotModel.findById(dto.slotId)) as any;
        }
        throw new ConflictException(
          'Slot is currently held by another patient',
        );
      }
      if (existing.startTime <= now) {
        throw new BadRequestException('Cannot hold a past slot');
      }

      throw new ConflictException('Slot is not available');
    }

    return slot;
  }

  // release slot

  async releaseSlot(slotId: string, patientId: string): Promise<any> {
    const slot = await this.slotModel.findOneAndUpdate({ _id: slotId, holdBy: patientId, status: SlotStatus.HOLD },
      {
        $set: {
          status: SlotStatus.AVAILABLE,
          holdBy: null,
          heldExpireDate: null,
        },
      },
      { new: true },
    );

    if (!slot) {
      throw new NotFoundException(`no held slots for this user`)
    }
    return slot;
  }

  // ─── Provider Rule Validation ─────────────────────────────────────────
  // validate provider availability to accept the appointment

  /**
   * book appointment
   *  1- validate provider availability
   *  
   */
  async validateProviderAvailability(
    providerId: string,
    appointmentDate: Date,
  ) {
    const schedule = await this.scheduleModel.findOne({
      providerId,
      isActive: true,
    });
    if (!schedule) {
      throw new NotFoundException('Provider schedule not found or inactive');
    }
    const now = DateTime.utc();
    const apptDt = DateTime.fromJSDate(appointmentDate);
    const dateStr = apptDt.toFormat('yyyy-MM-dd');
    //check blocked dates
    if (schedule.blockDates.includes(dateStr)) {
      throw new BadRequestException('Provider is not available on this date');
    }
    // check min advance booking (ex: ptrvent last minute boooking)
    const hoursUntil = apptDt.diff(now, 'hours').hours;
    if (hoursUntil < schedule.minAdvanceBookingHours) {
      throw new BadRequestException(
        `Appointments must be booked at least ${schedule.minAdvanceBookingHours} hours in advance`,
      );
    }

    // chcek max advance booking (prevent booking too far)
    let maxDate = now.plus({ days: schedule.advanceBookingDays });
    if (apptDt > maxDate) {
      throw new BadRequestException(
        `Appointments can only be booked up to ${schedule.advanceBookingDays} days in advance`,
      );
    }

    return schedule;
  }
  //   // ─── Slot Status Management (Called by AppointmentService) ────────────

  // 1) transition from available to booked
  // called with mongo  session transaction (to insure rollback in falure)
  // #) steps ** (from hold or available to booked)
  // 1) increase num of bookedCount by one
  // 2) clear hold metadate
  // 3) link appointment id
  async confirmSlotBooking(
    slotId: string,
    appointmentId: string,
    session: ClientSession,
  ): Promise<void> {
    const slot = await this.slotModel.findById(slotId).session(session).lean();

    if (!slot) throw new NotFoundException('Slot not found');

    const isHeldBySystem =
      slot.status === SlotStatus.HOLD || slot.status === SlotStatus.AVAILABLE;

    if (!isHeldBySystem) {
      throw new ConflictException('Slot is no longer available');
    }
    const newBookedCount = (slot.bookedCount ?? 0) + 1;
    const newStatus =
      newBookedCount >= slot.maxBookings
        ? SlotStatus.BOOKED
        : SlotStatus.AVAILABLE;

    await this.slotModel.updateOne(
      { _id: slotId },
      {
        $set: {
          status: newStatus,
          appointmentId,
          heldExpireDate: null,
          holdBy: null,
          bookedCount: newBookedCount,
        },
      },
      { session },
    );
  }
  // Frees a slot back to available status when an appointment is cancelled or rescheduled.
  // if booked cancelled ot rescheduled
  async freeSlot(slotId: string, session?: ClientSession): Promise<void> {
    const updateQuery = this.slotModel.updateOne(
      { _id: slotId },
      {
        $set: {
          status: SlotStatus.AVAILABLE,
          appointmentId: null,
          heldExpireDate: null,
          holdBy: null,
        },
        $inc: { bookedCount: -1 }, // Decrement safely even if multiple operations
      },
    );
    if (session) updateQuery.session(session);
    await updateQuery;
  }

  findSlotById(id: string): Promise<TimeSlotDocument | null> {
    return this.slotModel.findById(id).lean();
  }
}