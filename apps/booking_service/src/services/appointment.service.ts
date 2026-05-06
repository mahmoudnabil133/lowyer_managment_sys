import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
  CancellationDetails,
  CancelledBy,
} from '../models/appointment.schema';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

import {
  AppointmentHistory,
  AppointmentHistoryDocument,
} from '../models/appointment-history.schema';
import { AvailabilityService } from './avaiilability.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BookAppointmentDto,
  CancelAppointmentDto,
  ProviderNotesDto,
  RescheduleAppointmentDto,
  UpdateAppointmentStatusDto,
} from '../dtos/booking.dto';
import { DateTime } from 'luxon';

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.RESCHEDULED,
  ],
  [AppointmentStatus.CHECKED_IN]: [
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
  [AppointmentStatus.RESCHEDULED]: [],
};
@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);
  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(AppointmentHistory.name)
    private historyModel: Model<AppointmentHistoryDocument>,
    @InjectConnection() private connection: Connection,
    private availabilityService: AvailabilityService,
    private amqpConnection: AmqpConnection,
  ) {}

  // create appointment
  // steps
  /* 1) find slot
   * 2) check if slot available to be booked
   * 3) start transaction
   *     4) create  uniqueu booking refernce
   *     5) create appointment (pending)
   *     6) confirm slot
   *     7) audit trail (history)
   * 9) end transaction
   * 10) event publish
   *
   * */

  async bookAppointment(dto: BookAppointmentDto) {
    const slot = await this.availabilityService['slotModel']
      .findById(dto.slotId)
      .lean();
    if (!slot) {
      throw new NotFoundException('Slot not found');
    }
    await this.availabilityService.validateProviderAvailability(
      dto.providerId,
      slot.startTime,
    );
    const session = await this.connection.startSession();
    let appointment: any;
    try {
      await session.withTransaction(async () => {
        const bookingRef = this.generateBookingRef();
        [appointment] = await this.appointmentModel.create(
          [
            {
              bookingRef,
              providerId: dto.providerId,
              slotId: dto.slotId,
              patient: {
                patientId: dto.patientId,
                fullName: dto.patientFullName,
                phone: dto.patientPhone,
                email: dto.patientEmail,
                dateOfBirth: dto.patientDateOfBirth,
              },
              startTime: slot.startTime,
              endTime: slot.endTime,
              type: dto.type,
              chiefComplaint: dto.chiefComplaint,
              status: AppointmentStatus.PENDING,
            },
          ],
          { session },
        );

        await this.availabilityService.confirmSlotBooking(
          dto.slotId,
          appointment._id.toString(),
          session,
        );

        await this.historyModel.create(
          [
            {
              appointmentId: appointment._id,
              providerId: dto.providerId,
              patientId: dto.patientId,
              fromStatus: AppointmentStatus.PENDING,
              toStatus: AppointmentStatus.PENDING,
              changedByUserId: dto.patientId,
              changedByRole: 'patient',
              note: 'Appointment created',
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    await this.publishEvent('appointment.booked', {
      appointmentId: appointment!._id,
      bookingRef: appointment!.bookingRef,
      providerId: dto.providerId,
      patientId: dto.patientId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: dto.type,
    });

    return appointment;
  }

  // cancell appointment
  /*
   *
   * */

  async cancelAppointment(dto: CancelAppointmentDto) {
    const appointment = await this.appointmentModel.findById(dto.appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertTransition(appointment.status, AppointmentStatus.CANCELLED);

    // PREVENT CANCELLATION LESS THAN 2H
    const hoursUntil = DateTime.fromJSDate(appointment.startTime).diff(
      DateTime.utc(),
      'hours',
    ).hours;
    if (hoursUntil < 2 && dto.cancelledByRole === 'patient') {
      throw new BadRequestException(
        'Appointments cannot be cancelled less than 2 hours before the scheduled time',
      );
    }
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const prevStatus = appointment.status;
        appointment.status = AppointmentStatus.CANCELLED;

        appointment.cancellation = {
          cancelledBy: dto.cancelledByRole as CancelledBy,
          cancelledByUserId: dto.cancelledByUserId as any,
          reason: dto.reason,
          cancelledAt: new Date(),
          refundIssued: false,
        };
        await appointment.save({ session });

        // free slot so other  patients can  cancell it
        await this.availabilityService.freeSlot(
          appointment.slotId.toString(),
          session,
        );

        await this.historyModel.create(
          [
            {
              appointmentId: appointment._id,
              providerId: appointment.providerId,
              patientId: appointment.patient.patientId,
              fromStatus: prevStatus,
              toStatus: AppointmentStatus.CANCELLED,
              changedByUserId: dto.cancelledByUserId,
              changedByRole: dto.cancelledByRole,
              note: dto.reason,
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    await this.publishEvent('appointment.cancelled', {
      appointmentId: appointment._id,
      bookingRef: appointment.bookingRef,
      providerId: appointment.providerId,
      patientId: appointment.patient.patientId,
      reason: dto.reason,
      cancelledByRole: dto.cancelledByRole,
      startTime: appointment.startTime,
      refundRequired: appointment.isPaid,
    });
    return appointment;
  }

  /*
   * steps
   * 1) get appointment, slot (check found)
   * 2) check status transition (is it ok)
   * 3) check provider rules for new slot (is new slot available and can be )
   * 4) start SESSION transaction
   *     5) free old slot
   *     6) mark old appointment as rescheduled
   *     7) create new appointment(auto appoved by provider)
   *     8) confirm new slot
   *     9) audit trail
   * 10) end transaction
   * 11) event publish
   * */

  async rescheduleAppointment(dto: RescheduleAppointmentDto) {
    const appointment = await this.appointmentModel.findById(dto.appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const slot = await this.availabilityService['slotModel'].findById(
      dto.newSlotId,
    );
    if (!slot) {
      throw new NotFoundException('new slot not found');
    }
    this.assertTransition(appointment.status, AppointmentStatus.RESCHEDULED);

    //check provider rules
    await this.availabilityService.validateProviderAvailability(
      appointment.providerId.toString(),
      slot.startTime,
    );

    const session = await this.connection.startSession();
    let newAppointment: any;
    try {
      await session.withTransaction(async () => {
        await this.availabilityService.freeSlot(
          appointment.slotId.toString(),
          session,
        );
        appointment.status = AppointmentStatus.RESCHEDULED;
        appointment.reschedule = {
          previousSlotId: appointment.slotId,
          previousStartTime: appointment.startTime,
          rescheduledAt: new Date(),
          rescheduledByUserId: dto.rescheduledByUserId as any,
        };
        const [newAppointment] = await this.appointmentModel.create(
          [
            {
              bookingRef: this.generateBookingRef(),
              providerId: appointment.providerId,
              patient: appointment.patient,
              slotId: dto.newSlotId,
              status: AppointmentStatus.CONFIRMED,
              startTime: slot.startTime,
              endTime: slot.endTime,
              chiefComplaint: appointment.chiefComplaint,
            },
          ],
          { session },
        );

        appointment.rescheduledToAppointmentId = newAppointment._id;
        await appointment.save({ session });

        await this.availabilityService.confirmSlotBooking(
          dto.newSlotId,
          newAppointment._id.toString(),
          session,
        );

        await this.historyModel.create(
          [
            {
              appointmentId: appointment._id,
              providerId: appointment.providerId,
              patientId: appointment.patient.patientId,
              fromStatus: appointment.status,
              toStatus: AppointmentStatus.RESCHEDULED,
              changedByUserId: dto.rescheduledByUserId,
              changedByRole: dto.rescheduledByRole,
              note: `Rescheduled to ${newAppointment.bookingRef}`,
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    await this.publishEvent('appointment.rescheduled', {
      oldAppointmentId: appointment._id,
      newAppointmentId: newAppointment!._id,
      newBookingRef: newAppointment!.bookingRef,
      providerId: appointment.providerId,
      patientId: appointment.patient.patientId,
      oldStartTime: appointment.startTime,
      newStartTime: slot.startTime,
    });
    return appointment;
  }

  // manually update status by clinic staff (cehck-in , in_progress, complleted)
  async updateStatus(
    dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findById(dto.appointmentId);
    if (!appointment) throw new NotFoundException('Appointment not found');

    const toStatus = dto.toStatus as AppointmentStatus;
    this.assertTransition(appointment.status, toStatus);

    const prevStatus = appointment.status;
    appointment.status = toStatus;
    await appointment.save();

    await this.historyModel.create({
      appointmentId: appointment._id,
      providerId: appointment.providerId,
      patientId: appointment.patient.patientId,
      fromStatus: prevStatus,
      toStatus,
      changedByUserId: dto.changedByUserId,
      changedByRole: dto.changedByRole,
      note: dto.note,
    });

    await this.publishEvent(`appointment.${toStatus}`, {
      appointmentId: appointment._id,
      bookingRef: appointment.bookingRef,
      status: toStatus,
    });

    return appointment;
  }

  // add provider notes
  /*
   * used by provider to document
   *   diagnosis
   * treatment plan
   * Prescriptions
   * follow-up instructions
   * */

  async addProviderNotes(dto: ProviderNotesDto): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findByIdAndUpdate(
      dto.appointmentId,
      { $set: { providerNotes: dto.notes } },
      { new: true },
    );
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  // ──────────────────── Quires ──────────────────────────────────────────────

  async getAppointmentById(id: string): Promise<AppointmentDocument> {
    const appt = await this.appointmentModel.findById(id).lean();
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt as any;
  }
  // get provider appointments
  async getProviderAppointments(
    providerId: string,
    date: string,
    status?: AppointmentStatus,
  ) {
    const from = DateTime.fromISO(date).startOf('day').toJSDate();
    const to = DateTime.fromISO(date).endOf('day').toJSDate();

    const filter: any = { providerId, startTime: { $gte: from, $lte: to } };
    if (status) filter.status = status;

    return this.appointmentModel.find(filter).sort({ startTime: 1 }).lean();
  }

  // get patient appointments history
  async getPatientAppointments(
    patientId: string,
    page = 1,
    limit = 10,
    status?: AppointmentStatus,
  ) {
    const filter: any = { 'patient.patientId': patientId };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.appointmentModel
        .find(filter)
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.appointmentModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // get appointment history (audit trails)
  async getAppointmentHistory(appointmentId: string) {
    return this.historyModel
      .find({ appointmentId })
      .sort({ createdAt: 1 })
      .lean();
  }
  //helpers
  /*
   * validate state  transition
   * prevent illegal operations
   * */

  private assertTransition(from: AppointmentStatus, to: AppointmentStatus) {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition appointment from '${from}' to '${to}'`,
      );
    }
  }
  /*
   * Generates a unique, human-readable booking reference number.
   *
   * */
  private generateBookingRef(): string {
    const date = DateTime.utc().toFormat('yyyyMMdd');
    const suffix = uuidv4().split('-')[0].toUpperCase();
    return `APT-${date}-${suffix}`;
  }

  private async publishEvent(
    routingKey: string,
    payload: object,
  ): Promise<void> {
    try {
      await this.amqpConnection.publish('booking.exchange', routingKey, {
        ...payload,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Log but don't throw — event failure shouldn't break the booking
      // This implements "fire and forget" pattern
      this.logger.error(`Failed to publish event '${routingKey}'`, err);
    }
  }
}
