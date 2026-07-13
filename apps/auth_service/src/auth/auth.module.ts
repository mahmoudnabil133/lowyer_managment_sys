import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RefreshSchema, RefreshToken } from './refresh/refreshToken.model';
import { MailerModule } from '../nodemailer/nodemailer.module';
import { SharedRmqModule } from '../shared-rmq.module';
import { JwtStrategyService, RolesGuard } from '@app/common';
import { AuthRpcController } from '../rpcController/auth.rpc.controller';
import { AuthRpcService } from '../rpcController/auth.rpc.service';


@Module({
  imports: [
    UserModule, MongooseModule.forFeature([{ name: RefreshToken.name, schema: RefreshSchema }]),
    MailerModule,
    SharedRmqModule,
  ],
  controllers: [AuthController, AuthRpcController],
  providers: [AuthService, JwtStrategyService, RolesGuard, AuthRpcService],
})
export class AuthModule { }