import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { CatchExceptionsFilter } from './common/global.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api/v1/')
  app.use(cookieParser());
  await app.listen(process.env.AUTH_PORT ?? 3000);
}
bootstrap();
