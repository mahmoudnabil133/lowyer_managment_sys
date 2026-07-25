import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { AuthRpcService } from '../rpcController/auth.rpc.service';

@Controller()
export class AuthRpcController {
  private readonly logger = new Logger(AuthRpcController.name);

  constructor(private readonly authService: AuthRpcService) {}

  // Helper method to catch microservice errors and convert them to RpcException
  private handleRpcError(err: any) {
    this.logger.error(`RPC error: ${err.message}`);

    // Pass out a structured object so the gateway filter can extract it
    throw new RpcException({
      message: err.message || 'Internal error occurred',
      statusCode: err.status || err.statusCode || 500,
      name: err.name,
      code: err.code, // Useful for Mongoose 11000 duplicate keys
      errmsg: err.errmsg,
    });
  }

  @MessagePattern('auth.login')
  async login(@Payload() data: { email: string; password: string }) {
    try {
      return await this.authService.login(data);
    } catch (err) {
      this.handleRpcError(err);
    }
  }

  @MessagePattern('auth.register')
  async register(@Payload() data: any) {
    try {
      return await this.authService.regester(data);
    } catch (err) {
      this.handleRpcError(err);
    }
  }

  @MessagePattern('auth.refresh')
  async refresh(@Payload() data: { refreshToken: string }) {
    try {
      return await this.authService.refresh(data.refreshToken);
    } catch (err) {
      this.handleRpcError(err);
    }
  }

  @MessagePattern('auth.send-verification-code')
  async sendVerificationCode(@Payload() data: { email: string }) {
    try {
      return await this.authService.sendEmailVerificationCode(data.email);
    } catch (err) {
      this.handleRpcError(err);
    }
  }

  @MessagePattern('auth.validate-verification-code')
  async validateVerificationCode(@Payload() data: { code: string }) {
    try {
      return await this.authService.validateEmailVerificationCode(data.code);
    } catch (err) {
      this.handleRpcError(err);
    }
  }

  @MessagePattern('auth.send-password-reset-code')
  async sendPasswordResetCode(@Payload() data: { email: string }) {
    try {
      return await this.authService.sendPasswordResetCode(data);
    } catch (err) {
      this.handleRpcError(err);
    }
  }

  @MessagePattern('auth.validate-password-reset-code')
  async validatePasswordResetCode(
    @Payload() data: { code: string; password: string },
  ) {
    try {
      return await this.authService.validatePasswordResetCode(
        data.code,
        data.password,
      );
    } catch (err) {
      this.handleRpcError(err);
    }
  }
}
