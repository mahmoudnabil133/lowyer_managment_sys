import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(@Inject('AUTH_SERVICE') private client: ClientProxy) {}

  async login(email: string, password: string) {
    return lastValueFrom(this.client.send('auth.login', { email, password }));
  }

  async register(data: any) {
    return lastValueFrom(this.client.send('auth.register', data));
  }

  async refresh(refreshToken: string) {
    return lastValueFrom(this.client.send('auth.refresh', { refreshToken }));
  }

  async sendVerificationCode(email: string) {
    return lastValueFrom(
      this.client.send('auth.send-verification-code', { email }),
    );
  }

  async validateVerificationCode(code: string) {
    return lastValueFrom(
      this.client.send('auth.validate-verification-code', { code }),
    );
  }

  async sendPasswordResetCode(email: string) {
    return lastValueFrom(
      this.client.send('auth.send-password-reset-code', { email }),
    );
  }

  async validatePasswordResetCode(code: string, password: string) {
    return lastValueFrom(
      this.client.send('auth.validate-password-reset-code', { code, password }),
    );
  }
}
