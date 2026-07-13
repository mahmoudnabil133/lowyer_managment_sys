import {
  BadRequestException,
  ConflictException,
  Inject,
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
import { Connection, Model, Types } from 'mongoose';
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
import { ClientProxy } from '@nestjs/microservices';
import { SlotStatus } from '../models/slot.schema';
import { ApiFeatureService, NOTIFICATION_PATTERNS } from '@app/common';
import { lastValueFrom } from 'rxjs';

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.RESCHEDULED,
  ],
  [AppointmentStatus.CHECKED_IN]: [
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED
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
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,

  ) { }

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

  async bookAppointment(dto: BookAppointmentDto, patientId: string) {
    console.log(dto);
    const slot = await this.availabilityService.findSlotById(dto.slotId)
    if (!slot) {
      throw new NotFoundException('Slot not found');
    }
    if (slot.status === SlotStatus.HOLD && slot.holdBy?.toString() !== patientId) {
      throw new ConflictException('Slot is hold by another user');
    }
    const isHeldBySystem =
      slot.status === SlotStatus.HOLD || slot.status === SlotStatus.AVAILABLE; // slot is found but booked

    if (!isHeldBySystem) {
      throw new ConflictException('Slot is no longer availablee');
    }
    const schedule = await this.availabilityService.validateProviderAvailability(
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
              amount: schedule.appointmentPrice,
              currency: schedule.currency,
              isPaid: false,
              providerId: dto.providerId,
              slotId: dto.slotId,
              patient: {
                patientId: patientId,
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
              patientId: patientId,
              fromStatus: AppointmentStatus.PENDING,
              toStatus: AppointmentStatus.PENDING,
              changedByUserId: patientId,
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

    try {
      const paymentPayload = {
        appointmentId: appointment._id.toString(),
        bookingRef: appointment.bookingRef,
        patientId: patientId,
        providerId: dto.providerId,
        amount: schedule.appointmentPrice,
        currency: schedule.currency || 'EGP',
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
      };

      // NestJS ClientProxy uses .send() for request-response over RMQ
      const response = await lastValueFrom(
        this.paymentClient.send<{ url: string }>('payment.create_checkout', paymentPayload)
      );
      console.log(response);

      // Return both the pending database entry and the checkout page redirection URL
      return {
        ...appointment.toObject(),
        checkoutUrl: response.url,
      };
    } catch (error) {
      this.logger.error(`Failed to obtain checkout session link from Payment Service: ${error.message}`);
      throw new BadRequestException('Payment initialization failed. Please try again.');
    }    // await this.publishEvent('appointment.booked', {
    //   appointmentId: appointment!._id,
    //   bookingRef: appointment!.bookingRef,
    //   providerId: dto.providerId,
    //   patientId: patientId,
    //   startTime: slot.startTime,
    //   endTime: slot.endTime,
    //   type: dto.type,
    // });

    // return appointment;
  }

  // fulfillPaidAppointment

  async fulfillPaidAppointment(payload: { appointmentId: string, bookingRef: string, paymentId: string, amount: number }) {
    const session = await this.connection.startSession();

    try {

      console.log('fulfillPaidAppointment');

      await session.withTransaction(async () => {
        const appointment = await this.appointmentModel
          .findById(payload.appointmentId)
          .session(session);

        if (!appointment) {
          this.logger.error(`Critical: Appointment ${payload.appointmentId} not found during fulfillment.`);
          return;
        }

        // Safeguard against duplicate event deliveries
        if (appointment.status === AppointmentStatus.CONFIRMED) {
          this.logger.warn(`Appointment ${payload.bookingRef} is already marked as CONFIRMED.`);
          return;
        }

        // Enforce clean state machine rules
        this.assertTransition(appointment.status, AppointmentStatus.CONFIRMED);

        // Mutate status variables
        appointment.status = AppointmentStatus.CONFIRMED;
        appointment.isPaid = true;
        appointment.paymentId = new Types.ObjectId(payload.paymentId);
        await appointment.save({ session });
        await this.historyModel.create(
          [
            {
              appointmentId: appointment._id,
              providerId: appointment.providerId,
              patientId: appointment.patient.patientId,
              fromStatus: AppointmentStatus.PENDING,
              toStatus: AppointmentStatus.CONFIRMED,
              changedByUserId: appointment.patient.patientId,
              changedByRole: 'system',
              note: `Payment captured successfully. Confirmed via transaction tracking ref: ${payload.bookingRef}`,
            },
          ],
          { session },
        );
        const confirmedAppt = await this.appointmentModel.findById(payload.appointmentId).lean();
        if (confirmedAppt) {
          await this.publishEvent(NOTIFICATION_PATTERNS.APPOINTMENT_BOOKED, confirmedAppt);
        }
      });
    } catch (error) {
      this.logger.error(`Failed to confirm appointment ${payload.appointmentId}: ${error.message}`);
      throw error;
    } finally {
      await session.endSession();
    }
  }
  // cancell appointment
  /*
   *
   * */

  async cancelAppointment(dto: CancelAppointmentDto, cancelledByUserId: string, cancelledByRole: string) {
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
    if (hoursUntil < 2 && cancelledByRole === 'patient') {
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
          cancelledBy: cancelledByRole as CancelledBy,
          cancelledByUserId: cancelledByUserId as any,
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
              changedByUserId: cancelledByUserId,
              changedByRole: cancelledByRole,
              note: dto.reason,
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    await this.publishEvent(NOTIFICATION_PATTERNS.APPOINTMENT_CANCELLED, {
      appointmentId: appointment._id,
      bookingRef: appointment.bookingRef,
      providerId: appointment.providerId,
      patientId: appointment.patient.patientId,
      patientName: appointment.patient.fullName,
      patientEmail: appointment.patient.email,
      patientPhone: appointment.patient.phone,
      reason: dto.reason,
      cancelledByRole: cancelledByRole,
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

  async rescheduleAppointment(dto: RescheduleAppointmentDto, rescheduledByUserId: string, rescheduledByRole: string) {
    console.log(`reschedule dto is ==> \n${JSON.stringify(dto)}`);

    const appointment = await this.appointmentModel.findById(dto.appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.slotId.toString() === dto.newSlotId) {
      throw new BadRequestException('new slot is same as old slot');
    }
    const slot = await this.availabilityService.findSlotById(
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
          rescheduledByUserId: rescheduledByUserId as any,
        };
        [newAppointment] = await this.appointmentModel.create(
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
              changedByUserId: rescheduledByUserId,
              changedByRole: rescheduledByRole,
              note: `Rescheduled to ${newAppointment.bookingRef}`,
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    await this.publishEvent(NOTIFICATION_PATTERNS.APPOINTMENT_RESCHEDULED, {
      oldAppointmentId: appointment._id,
      newAppointmentId: newAppointment!._id,
      newBookingRef: newAppointment!.bookingRef,
      providerId: appointment.providerId,
      patientId: appointment.patient.patientId,
      patientName: appointment.patient.fullName,
      patientEmail: appointment.patient.email,
      patientPhone: appointment.patient.phone,
      oldStartTime: appointment.startTime,
      newStartTime: slot.startTime,
    });

    return appointment;
  }

  // manually update status by clinic staff (cehck-in , in_progress, complleted)
  async updateStatus(
    dto: UpdateAppointmentStatusDto,
    changedByUserId: string,
    changedByRole: string,
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
      changedByUserId,
      changedByRole,
      note: dto.note,
    });

    await this.publishEvent(`appointment.${toStatus}`, {
      appointmentId: appointment._id,
      bookingRef: appointment.bookingRef,
      status: toStatus,
      patientEmail: appointment.patient.email,
      patientName: appointment.patient.fullName,
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
  async getProviderAppointments(providerId: string, queryArgs: any) {
    const filter: any = { providerId };
    if (queryArgs.date) {
      const from = DateTime.fromISO(queryArgs.date).startOf('day').toJSDate();
      const to = DateTime.fromISO(queryArgs.date).endOf('day').toJSDate();
      filter.startTime = { $gte: from, $lte: to };
    }
    if (queryArgs.status) {
      filter.status = queryArgs.status;
    }

    // delete them as they will to avoid filtering y these properities
    delete queryArgs.date;
    delete queryArgs.status;

    const features = new ApiFeatureService(queryArgs, this.appointmentModel, filter);

    if (!queryArgs.sort) {
      features.query = features.query.sort({ startTime: 1 });
    }

    // 5. Chain the rest of the features and execute
    return await features
      .filter()
      .sort()
      .select()
      .paginate()
      .execute();
  }

  async getPatientAppointments(patientId: string, queryArgs: any) {
    const filter: any = { 'patient.patientId': patientId };

    if (queryArgs.date) {
      const from = DateTime.fromISO(queryArgs.date).startOf('day').toJSDate();
      const to = DateTime.fromISO(queryArgs.date).endOf('day').toJSDate();
      filter.startTime = { $gte: from, $lte: to };
    }

    if (queryArgs.status) {
      filter.status = queryArgs.status;
    }

    delete queryArgs.date;
    delete queryArgs.status;

    const features = new ApiFeatureService(queryArgs, this.appointmentModel, filter);

    if (!queryArgs.sort) {
      features.query = features.query.sort({ startTime: -1 });
    }

    return await features
      .filter()
      .sort()
      .select()
      .paginate()
      .execute();
  }

  // get appointment history (audit trails)
  async getAppointmentHistory(appointmentId: string) {
    console.log({ appointmentId })
    return await this.historyModel
      .find({ appointmentId: new Types.ObjectId(appointmentId) })
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
    pattern: string,
    payload: object,
  ): Promise<void> {
    try {
      // NestJS ClientProxy uses .emit() for asynchronous fire-and-forget message patterns
      this.notificationClient.emit(pattern, {
        ...payload,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(`Failed to emit event with pattern '${pattern}'`, err);
    }
  }
}
