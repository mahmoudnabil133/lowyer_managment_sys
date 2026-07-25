import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from '../user/dto/createUser.dto';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshDocument } from './refresh/refreshToken.model';
import express from 'express';
import * as crypto from 'crypto';
import { MailerService } from '../nodemailer/nodemailer.service';
import { ClientProxy } from '@nestjs/microservices';
import { NOTIFICATION_PATTERNS } from '@app/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly config: ConfigService,
    private readonly mailService: MailerService,
    @InjectModel('RefreshToken')
    private readonly refreshTokenModel: Model<RefreshDocument>,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
  ) {}

  async login(
    body: { email: string; password: string },
    res: express.Response,
  ) {
    const user = await this.userService.findByEmail(body.email);

    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      throw new HttpException('Invalid Credentials', HttpStatus.UNAUTHORIZED);
    }
    this.logger.log(`User logged in: ${user.email}`);
    return await this.createAndSendToken(user._id, user.email, user.role, res);
  }

  async createAndSendToken(
    userId: any,
    email: string,
    role: string,
    res: express.Response,
  ) {
    const access_token = await this.createAccessToken(userId, email, role);
    const refreshToken = await this.createRefreshToken(userId);

    return res
      .status(200)
      .cookie('refresh_token', refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ access_token });
  }

  async regester(createUserDto: CreateUserDto) {
    createUserDto.password = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.userService.saveUser(createUserDto);
    this.notificationClient.emit(NOTIFICATION_PATTERNS.USER_CREATED, {
      userId: user._id,
      email: user.email,
      name: user.name,
    });
    return { msg: 'success, now you have to login ' };
  }
  async createAccessToken(sub: any, email: string, role: string) {
    const payload = { sub, email, role };
    return this.jwtService.sign(payload, {
      secret: this.config.get('access_secret'),
      expiresIn: '15m',
    });
  }
  async createRefreshToken(sub: any) {
    const payload = { sub };
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('refresh_secret'),
      expiresIn: '7d',
    });
    const hashed_token = await bcrypt.hash(refreshToken, 12);

    const Token = {
      userId: sub.toString(),
      refreshToken,
      hashed_token,
      expiresIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    await this.refreshTokenModel.create(Token);
    return refreshToken;
  }

  // mailing
  generateResetCode() {
    return String(Math.floor(1000 + Math.random() * 8000));
  }

  createHash(code: string) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async sendEmailVerificationCode(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user)
      throw new HttpException('Invalid Credentials', HttpStatus.UNAUTHORIZED);

    const code = this.generateResetCode();
    const hashedCode = this.createHash(code);
    user.virificationCode = hashedCode;
    user.virificationCodeExpires = new Date(Date.now() + 3 * 60 * 1000); // expires in 3 min
    try {
      await this.mailService.sendVerifyEmail({
        code,
        name: user.name,
        mail: user.email,
      });
    } catch (err) {
      user.virificationCode = undefined;
      user.virificationCodeExpires = undefined;
      throw new HttpException(
        'error in sending email',
        HttpStatus.UNAUTHORIZED,
      );
    }
    await user.save();
    return { msg: 'success, check verification code we sent to your email' };
  }
  async sendPasswordResetCode(body: { email: string }) {
    const user = await this.userService.findByEmail(body.email);
    if (!user)
      throw new HttpException('Invalid Credentials', HttpStatus.UNAUTHORIZED);

    const code = this.generateResetCode();
    const hashedCode = this.createHash(code);
    user.passwordResetCode = hashedCode;
    user.passwordResetCodeExpiresIn = new Date(Date.now() + 3 * 60 * 1000); // expires in 3 min
    try {
      await this.mailService.sendChangingPasswordCode({
        code,
        name: user.name,
        mail: user.email,
      });
    } catch (err) {
      user.passwordResetCode = undefined;
      user.passwordResetCodeExpiresIn = undefined;
      throw new HttpException(
        'error in sending email',
        HttpStatus.UNAUTHORIZED,
      );
    }
    await user.save();
    return { msg: 'success, check verification code we sent to your email' };
  }

  async validateEmailVerificationCode(code: string) {
    this.logger.log(`Validating email verification code`);
    const user = await this.userService.findByEmailverificationCode(
      this.createHash(code),
    );
    if (!user) throw new HttpException('Invalid code', HttpStatus.UNAUTHORIZED);

    user.isVerified = true;
    user.virificationCode = undefined;
    user.virificationCodeExpires = undefined;
    await user.save();
  }
  async validatePasswordResetCode(
    code: string,
    password: string,
    res: express.Response,
  ) {
    const user = await this.userService.findByResetCode(this.createHash(code));
    if (!user) throw new HttpException('Invalid code', HttpStatus.UNAUTHORIZED);

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpiresIn = undefined;
    user.passwordChangedAt = new Date();
    await user.save();
    return await this.createAndSendToken(user._id, user.email, user.role, res);
  }

  async refresh(req: express.Request, res: express.Response) {
    const refresh = req.cookies?.refresh_token;
    if (!refresh) {
      throw new UnauthorizedException('Refresh token not found');
    }
    const payload = this.jwtService.verify(refresh, {
      secret: this.config.get('refresh_secret'),
    });
    if (!payload) {
      throw new UnauthorizedException('Refresh is not valid');
    }
    const userId = payload.sub;
    const users: RefreshDocument[] = await this.refreshTokenModel.find({
      userId: userId,
    });
    if (!users) {
      throw new UnauthorizedException('Refresh is not valid');
    }
    const comparisions = await Promise.all(
      users.map((user: RefreshDocument) =>
        bcrypt.compare(refresh, user.refreshToken),
      ),
    );
    const isMatch = comparisions.findIndex((m) => m == true);
    if (!isMatch) {
      throw new UnauthorizedException('Refresh is not valid');
    }

    const user = await this.userService.findById(userId);
    const access_token = await this.createAccessToken(
      userId,
      user.email,
      user.role,
    );

    return res.status(200).json({ access_token });
  }
}
