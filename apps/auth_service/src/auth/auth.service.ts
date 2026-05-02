import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken';
import { User, UserDocument } from '../user/user.schema';
import { CreateUserDto } from '../user/dto/createUser.dto';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RefreshDocument } from './refresh/refreshToken.model';
import express from 'express';
import ObjectId from 'mongodb';
import * as crypto from 'crypto';
import { MailerService } from '../nodemailer/nodemailer.service';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly config: ConfigService,
    private readonly mailService: MailerService,
    @InjectModel('RefreshToken')
    private readonly refreshTokenModel: Model<RefreshDocument>,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient:ClientProxy,
  ) {}

  async login(
    body: { email: string; password: string },
    res: express.Response,
  ) {
    let user = await this.userService.findByEmail(body.email);
    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      throw new HttpException('Invalid Credentials', HttpStatus.UNAUTHORIZED);
    }
    return await  this.createAndSendToken(user._id, user.email, user.role, res);
  }

  async createAndSendToken(userId: any, email: string, role: string, res: express.Response) {
    let access_token = await this.createAccessToken(
      userId,
      email,
      role,
    );
    let refreshToken = await this.createRefreshToken(userId);

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
    let user = await this.userService.saveUser(createUserDto);
    this.notificationClient.emit('user_created', { userId: user._id, email: user.email });
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
    let refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('refresh_secret'),
      expiresIn: '7d',
    });
    let hashed_token = await bcrypt.hash(refreshToken, 12);

    let Token = {
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
    if (!user)  throw new HttpException('Invalid Credentials', HttpStatus.UNAUTHORIZED);

    const code = this.generateResetCode();
    const hashedCode = this.createHash(code);
    user.virificationCode = hashedCode;
    user.virificationCodeExpires = new Date(Date.now() + 3 *60 *1000); // expires in 3 min
    try{
      await this.mailService.sendVerifyEmail({code, name: user.name, mail:user.email});
    }catch(err){
      user.virificationCode = undefined;
      user.virificationCodeExpires = undefined;
      throw new HttpException('error in sending email', HttpStatus.UNAUTHORIZED);
    }
    await user.save();
    return { msg: 'success, check verification code we sent to your email' };
  }
  async sendPasswordResetCode(body: {email: string}) {
    const user = await this.userService.findByEmail(body.email);
    if (!user)  throw new HttpException('Invalid Credentials', HttpStatus.UNAUTHORIZED);

    const code = this.generateResetCode();
    const hashedCode = this.createHash(code);
    user.passwordResetCode = hashedCode;
    user.passwordResetCodeExpiresIn = new Date(Date.now() + 3 *60 *1000); // expires in 3 min
    try{
      await this.mailService.sendChangingPasswordCode({code, name: user.name, mail:user.email});
    }catch(err){
      user.passwordResetCode = undefined;
      user.passwordResetCodeExpiresIn = undefined;
      throw new HttpException('error in sending email', HttpStatus.UNAUTHORIZED);
    }
    await user.save();
    return {msg: 'success, check verification code we sent to your email' };
  }

  async validateEmailVerificationCode(code: string){
    console.log(code);    
    let user = await this.userService.findByEmailverificationCode(this.createHash(code));
    if(!user)  throw new HttpException('Invalid code', HttpStatus.UNAUTHORIZED);

    user.isVerified = true;
    user.virificationCode = undefined;
    user.virificationCodeExpires = undefined;
    await user.save();

  }
  async validatePasswordResetCode(code: string, password: string, res: express.Response) {
    let user = await this.userService.findByResetCode(this.createHash(code));
    if(!user)  throw new HttpException('Invalid code', HttpStatus.UNAUTHORIZED);

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpiresIn = undefined;
    user.passwordChangedAt = new Date();
    await user.save();
    return await this.createAndSendToken(user._id, user.email, user.role, res);
  }

  async refresh(req: express.Request, res: express.Response) {
    let refresh = req.cookies?.refresh_token;
    if (!refresh) {
      throw new UnauthorizedException('Refresh token not found');
    }
    let payload = this.jwtService.verify(refresh, {
      secret: this.config.get('refresh_secret'),
    });
    if (!payload) {
      throw new UnauthorizedException('Refresh is not valid');
    }
    const userId = payload.sub;
    let users: RefreshDocument[] = await this.refreshTokenModel.find({
      userId: userId,
    });
    if (!users) {
      throw new UnauthorizedException('Refresh is not valid');
    }
    let comparisions = await Promise.all(
      users.map((user: RefreshDocument) =>
        bcrypt.compare(refresh, user.refreshToken),
      ),
    );
    let isMatch = comparisions.findIndex((m) => m == true);
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