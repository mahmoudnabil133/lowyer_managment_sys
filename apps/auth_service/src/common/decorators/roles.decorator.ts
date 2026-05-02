import { Reflector } from '@nestjs/core';
import { Role } from '../types/roles.enum';

export const Roles = Reflector.createDecorator<string[]>();