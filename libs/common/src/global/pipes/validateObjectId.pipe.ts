import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ValidateObjectIdPipe implements PipeTransform {
  transform(value: any): any {
    if (!value) return new BadRequestException('Feild is required');
    const isValid = Types.ObjectId.isValid(value);
    if (!isValid) return new BadRequestException('Feild is not valid obj id');
    return value;
  }
}
