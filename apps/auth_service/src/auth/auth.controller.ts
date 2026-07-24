import { AuthService } from './auth.service';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import express from 'express';
import { CreateUserDto } from '../user/dto/createUser.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res() res: express.Response,
  ) {
    return await this.authService.login(body, res);
  }

  @Post('register')
  async register(@Body() body: CreateUserDto) {
    return await this.authService.regester(body);
  }

  @Post('refresh')
  async refresh(@Req() req: express.Request, @Res() res: express.Response) {
    return await this.authService.refresh(req, res);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Req() req: express.Request) {
    return req.user;
  }

  @Post('send-verification-code')
  async sendVerificationCode(@Body('email') email: string) {
    return this.authService.sendEmailVerificationCode(email);
  }

  // 2️⃣ Send Password Reset Code
  @Post('send-password-reset-code')
  async sendPasswordResetCode(@Body() body: { email: string }) {
    return this.authService.sendPasswordResetCode(body);
  }

  // 3️⃣ Validate Email Verification Code
  @Post('validate-verification-code')
  async validateVerificationCode(@Body('code') code: string) {
    await this.authService.validateEmailVerificationCode(code);
    return { msg: 'Email verified successfully' };
  }

  // 4️⃣ Validate Password Reset Code
  @Post('validate-password-reset-code')
  async validatePasswordResetCode(
    @Body('code') code: string,
    @Body('password') password: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    return this.authService.validatePasswordResetCode(code, password, res);
  }
}
