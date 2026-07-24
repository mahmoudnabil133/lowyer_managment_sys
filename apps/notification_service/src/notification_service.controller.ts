import { Controller, Logger, UseFilters } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '@app/rmq';
import { MailerService } from './nodemailer/nodemailer.service';
import { NOTIFICATION_PATTERNS } from '@app/common';
import { CatchExceptionsFilter } from '@app/common';

interface UserCreatedPayload {
  userId: string;
  email: string;
  name?: string;
}

interface AppointmentBookedPayload {
  _id: any;
  bookingRef: string;
  providerId: any;
  patient: {
    patientId: any;
    fullName: string;
    phone: string;
    email: string;
  };
  startTime: Date;
  type: string;
  meeting_link?: string;
  timestamp?: string;
}

interface AppointmentCancelledPayload {
  bookingRef: string;
  providerId: any;
  patientName: string;
  patientEmail: string;
  reason: string;
  startTime: Date;
  timestamp?: string;
}

interface AppointmentRescheduledPayload {
  newBookingRef: string;
  providerId: any;
  patientName: string;
  patientEmail: string;
  oldStartTime: Date;
  newStartTime: Date;
  timestamp?: string;
}

interface AppointmentStatusPayload {
  appointmentId: any;
  bookingRef: string;
  status: string;
  patientEmail?: string;
  patientName?: string;
  timestamp?: string;
}

@UseFilters(CatchExceptionsFilter)
@Controller()
export class NotificationServiceController {
  private readonly logger = new Logger(NotificationServiceController.name);

  constructor(
    private readonly rmqService: RmqService,
    private readonly mailerService: MailerService,
  ) {}

  private fmtDate(d: Date | string): string {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private fmtTime(d: Date | string): string {
    return new Date(d).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private providerLabel(id: any): string {
    return `Provider #${id?.toString?.()?.slice(-6) || 'Unknown'}`;
  }

  @EventPattern(NOTIFICATION_PATTERNS.USER_CREATED)
  async handleUserCreated(
    @Payload() data: UserCreatedPayload,
    @Ctx() context: RmqContext,
  ) {
    try {
      await this.mailerService.sendWelcomeEmail({
        mail: data.email,
        name: data.name || 'Valued User',
      });
      this.logger.log(`Welcome email sent to ${data.email}`);
    } catch (error) {
      this.logger.error(`user_created handler error: ${error.message}`);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern(NOTIFICATION_PATTERNS.APPOINTMENT_BOOKED)
  async handleAppointmentBooked(
    @Payload() data: AppointmentBookedPayload,
    @Ctx() context: RmqContext,
  ) {
    try {
      await this.mailerService.sendBookingConfirmation({
        mail: data.patient.email,
        patientName: data.patient.fullName,
        providerName: this.providerLabel(data.providerId),
        date: this.fmtDate(data.startTime),
        time: this.fmtTime(data.startTime),
        location: data.type || 'Virtual',
        meetingLink: data.meeting_link,
        bookingRef: data.bookingRef,
      });
      this.logger.log(`Booking confirmation sent to ${data.patient.email}`);
    } catch (error) {
      this.logger.error(`appointment.booked handler error: ${error.message}`);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern(NOTIFICATION_PATTERNS.APPOINTMENT_CANCELLED)
  async handleAppointmentCancelled(
    @Payload() data: AppointmentCancelledPayload,
    @Ctx() context: RmqContext,
  ) {
    try {
      await this.mailerService.sendCancellationNotice({
        mail: data.patientEmail,
        patientName: data.patientName,
        providerName: this.providerLabel(data.providerId),
        date: this.fmtDate(data.startTime),
        time: this.fmtTime(data.startTime),
        bookingRef: data.bookingRef,
        reason: data.reason,
      });
      this.logger.log(`Cancellation notice sent to ${data.patientEmail}`);
    } catch (error) {
      this.logger.error(
        `appointment.cancelled handler error: ${error.message}`,
      );
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern(NOTIFICATION_PATTERNS.APPOINTMENT_RESCHEDULED)
  async handleAppointmentRescheduled(
    @Payload() data: AppointmentRescheduledPayload,
    @Ctx() context: RmqContext,
  ) {
    try {
      await this.mailerService.sendRescheduledNotice({
        mail: data.patientEmail,
        patientName: data.patientName,
        providerName: this.providerLabel(data.providerId),
        oldDate: this.fmtDate(data.oldStartTime),
        oldTime: this.fmtTime(data.oldStartTime),
        newDate: this.fmtDate(data.newStartTime),
        newTime: this.fmtTime(data.newStartTime),
        bookingRef: data.newBookingRef,
      });
      this.logger.log(`Reschedule notice sent to ${data.patientEmail}`);
    } catch (error) {
      this.logger.error(
        `appointment.rescheduled handler error: ${error.message}`,
      );
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('appointment.checked_in')
  async handleAppCheckedIn(
    @Payload() data: AppointmentStatusPayload,
    @Ctx() context: RmqContext,
  ) {
    try {
      this.logger.log(`Appointment ${data.appointmentId} checked in`);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('appointment.in_progress')
  async handleAppInProgress(
    @Payload() data: AppointmentStatusPayload,
    @Ctx() context: RmqContext,
  ) {
    try {
      this.logger.log(`Appointment ${data.appointmentId} in progress`);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('appointment.completed')
  async handleAppCompleted(
    @Payload() data: AppointmentStatusPayload,
    @Ctx() context: RmqContext,
  ) {
    try {
      if (data.patientEmail) {
        await this.mailerService.sendAppointmentCompleted({
          mail: data.patientEmail,
          bookingRef: data.bookingRef,
        });
      }
      this.logger.log(`Appointment ${data.appointmentId} completed`);
    } catch (error) {
      this.logger.error(
        `appointment.completed handler error: ${error.message}`,
      );
    } finally {
      this.rmqService.ack(context);
    }
  }
}
