import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategyService } from './jwt-strategy/jwt-strategy.service';
import { RolesGuard } from './Roles/roles.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { RefreshSchema, RefreshToken } from './refresh/refreshToken.model';
import { MailerModule } from '../nodemailer/nodemailer.module';
import { SharedRmqModule } from '../shared-rmq.module';


@Module({
  imports:[
    UserModule, MongooseModule.forFeature([{name: RefreshToken.name, schema: RefreshSchema}]),
    MailerModule,
    SharedRmqModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategyService, RolesGuard],
})
export class AuthModule {}