import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';

interface ServerError {
  message?: string;
  statusCode?: number;
  error?: string;
  timestamp?: string;
}

@Catch()
export class CatchGatewayExceptionsFilter extends BaseExceptionFilter {
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const object: ServerError = {
      timestamp: new Date().toISOString(),
    };
    let statusCode = HttpStatus.BAD_REQUEST;

    console.log('Captured Exception: ', exception);

    // 1️⃣ FIX: Directly check for the root microservice object properties matching your log
    if (exception && exception.statusCode && exception.message) {
      statusCode = exception.statusCode;
      object.message = exception.message;
      object.error = exception.name || 'RpcException';
    }
    // 2️⃣ Nested Rpc Error patterns fallback
    else if (exception?.error && typeof exception.error === 'object') {
      const rpcError = exception.error;
      statusCode = rpcError.statusCode || 400;
      object.message = rpcError.message || 'Microservice Error';
      object.error = rpcError.name || 'MicroserviceException';
    }
    // 3️⃣ NestJS Built-in class Validation Errors (DTOs)
    else if (
      exception?.response?.message &&
      Array.isArray(exception.response.message)
    ) {
      statusCode = exception.response.statusCode || HttpStatus.BAD_REQUEST;
      object.message = exception.response.message.join(' and ');
      object.error = 'ValidationError';
    }
    // 4️⃣ Native local HTTP Exceptions
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const resPayload: any = exception.getResponse();
      object.message =
        typeof resPayload === 'string' ? resPayload : resPayload.message;
      object.error = exception.name;
    }
    // 5️⃣ Fallback for everything else
    else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      object.message = exception?.message || 'Internal server error';
      object.error = 'InternalServerError';
    }

    object.statusCode = statusCode;

    // Output formatted clean JSON response back to user client
    res
      .status(statusCode)
      .json({ message: object.message, code: object.statusCode });
  }
}
