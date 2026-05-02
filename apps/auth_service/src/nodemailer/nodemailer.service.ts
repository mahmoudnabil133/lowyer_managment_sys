import { Inject, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { reset_password_html } from './html/reset-password';
import { verification_email_html } from './html/verify-email';

@Injectable()
export class MailerService {
  from = 'HealthCareService';
  constructor(
    @Inject('TRANSPORTER') private transporter: nodemailer.Transporter,
  ) {}
  sendChangingPasswordCode(body: { mail: string; name: string; code: string }) {
    const to = body.mail;
    const html = reset_password_html(body.code, body.name);
    return this.sendMail({ from: this.from, to, html });
  }
  sendVerifyEmail(body: { mail: string; name: string; code: string }) {
    const to = body.mail;
    const html = verification_email_html(body.code, body.name);
    return this.sendMail({ from: this.from, to, html });
  }
  private sendMail(opts: { from: string; to: string; html: string }) {
    return this.transporter.sendMail(opts);
  }
}
