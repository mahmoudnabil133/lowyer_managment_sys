import { Inject, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  welcomeEmailHtml,
  bookingConfirmationHtml,
  cancellationHtml,
  reminder24hHtml,
  reminder1hHtml,
  rescheduledHtml,
  completedHtml,
  reset_password_html,
  verification_email_html,
} from './html';

@Injectable()
export class MailerService {
  from = 'Booking Management System <hodanabil155@gmail.com>';

  constructor(
    @Inject('TRANSPORTER') private transporter: nodemailer.Transporter,
  ) {}

  // ─── Existing methods (refactored to use the new naming) ───

  sendResetPasswordCode(opts: { mail: string; name: string; code: string }) {
    return this.sendMail({
      to: opts.mail,
      subject: 'Reset Your Password',
      html: reset_password_html(opts.code, opts.name),
    });
  }

  sendVerificationCode(opts: { mail: string; name: string; code: string }) {
    return this.sendMail({
      to: opts.mail,
      subject: 'Verify Your Email',
      html: verification_email_html(opts.code, opts.name),
    });
  }

  // ─── New methods ───

  sendWelcomeEmail(opts: { mail: string; name: string; verifyUrl?: string }) {
    return this.sendMail({
      to: opts.mail,
      subject: 'Welcome to Lawyer Management System!',
      html: welcomeEmailHtml(opts.name, opts.verifyUrl),
    });
  }

  sendBookingConfirmation(opts: {
    mail: string;
    patientName: string;
    providerName: string;
    date: string;
    time: string;
    location: string;
    meetingLink?: string;
    bookingRef: string;
  }) {
    return this.sendMail({
      to: opts.mail,
      subject: 'Appointment Confirmed',
      html: bookingConfirmationHtml(opts),
    });
  }

  sendCancellationNotice(opts: {
    mail: string;
    patientName: string;
    providerName: string;
    date: string;
    time: string;
    bookingRef: string;
    reason?: string;
  }) {
    return this.sendMail({
      to: opts.mail,
      subject: 'Appointment Cancelled',
      html: cancellationHtml(opts),
    });
  }

  sendReminder24h(opts: {
    mail: string;
    patientName: string;
    providerName: string;
    date: string;
    time: string;
    location: string;
    meetingLink?: string;
  }) {
    return this.sendMail({
      to: opts.mail,
      subject: 'Reminder: Appointment Tomorrow',
      html: reminder24hHtml(opts),
    });
  }

  sendReminder1h(opts: {
    mail: string;
    patientName: string;
    providerName: string;
    meetingLink?: string;
  }) {
    return this.sendMail({
      to: opts.mail,
      subject: 'Reminder: Appointment in 1 Hour',
      html: reminder1hHtml(opts),
    });
  }

  sendRescheduledNotice(opts: {
    mail: string;
    patientName: string;
    providerName: string;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    bookingRef: string;
  }) {
    return this.sendMail({
      to: opts.mail,
      subject: 'Appointment Rescheduled',
      html: rescheduledHtml(opts),
    });
  }

  sendAppointmentCompleted(opts: { mail: string; bookingRef: string }) {
    return this.sendMail({
      to: opts.mail,
      subject: 'Appointment Completed – We Value Your Feedback',
      html: completedHtml(opts.bookingRef),
    });
  }

  // ─── Private ───

  private sendMail(opts: { to: string; subject: string; html: string }) {
    return this.transporter.sendMail({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  }
}
