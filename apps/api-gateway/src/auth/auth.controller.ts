import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@CurrentUser() user: any) {
    console.log(user);
    return user;
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('send-verification-code')
  async sendVerificationCode(@Body('email') email: string) {
    return this.authService.sendVerificationCode(email);
  }

  @Post('validate-verification-code')
  async validateVerificationCode(@Body('code') code: string) {
    return this.authService.validateVerificationCode(code);
  }

  @Post('send-password-reset-code')
  async sendPasswordResetCode(@Body('email') email: string) {
    return this.authService.sendPasswordResetCode(email);
  }

  @Post('validate-password-reset-code')
  async validatePasswordResetCode(
    @Body() body: { code: string; password: string },
  ) {
    return this.authService.validatePasswordResetCode(body.code, body.password);
  }
}
