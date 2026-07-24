import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from '../user/dto/createUser.dto';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { MailerService } from '../nodemailer/nodemailer.service';
import { ClientProxy } from '@nestjs/microservices';
import { RefreshDocument } from '../auth/refresh/refreshToken.model';
import { NOTIFICATION_PATTERNS } from '@app/common';

@Injectable()
export class AuthRpcService {
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

  async login(body: { email: string; password: string }) {
    const user = await this.userService.findByEmail(body.email);
    console.log(user);

    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      console.log('here invalid');

      throw new NotFoundException('Invalid Credentials');
    }
    console.log(`User logged in: ${user.email}`);
    return await this.createAndSendToken(user._id, user.email, user.role);
  }

  async createAndSendToken(userId: any, email: string, role: string) {
    const access_token = await this.createAccessToken(userId, email, role);
    const refresh_token = await this.createRefreshToken(userId);

    // Returns both tokens directly in the payload
    return {
      access_token,
      refresh_token,
    };
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
    console.log(code);
    const user = await this.userService.findByEmailverificationCode(
      this.createHash(code),
    );
    if (!user) throw new HttpException('Invalid code', HttpStatus.UNAUTHORIZED);

    user.isVerified = true;
    user.virificationCode = undefined;
    user.virificationCodeExpires = undefined;
    await user.save();
  }

  async validatePasswordResetCode(code: string, password: string) {
    const user = await this.userService.findByResetCode(this.createHash(code));
    if (!user) throw new HttpException('Invalid code', HttpStatus.UNAUTHORIZED);

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpiresIn = undefined;
    user.passwordChangedAt = new Date();
    await user.save();
    return await this.createAndSendToken(user._id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('refresh_secret'),
      });
    } catch (err) {
      throw new UnauthorizedException('Refresh is not valid');
    }

    const userId = payload.sub;
    const users: RefreshDocument[] = await this.refreshTokenModel.find({
      userId: userId,
    });

    if (!users || users.length === 0) {
      throw new UnauthorizedException('Refresh is not valid');
    }

    const comparisons = await Promise.all(
      users.map((user: RefreshDocument) =>
        bcrypt.compare(refreshToken, user.refreshToken),
      ),
    );

    const isMatch = comparisons.findIndex((m) => m === true);
    if (isMatch === -1) {
      throw new UnauthorizedException('Refresh is not valid');
    }

    const user = await this.userService.findById(userId);
    const access_token = await this.createAccessToken(
      userId,
      user.email,
      user.role,
    );

    return { access_token };
  }
}
