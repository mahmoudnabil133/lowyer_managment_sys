import { Reflector } from '@nestjs/core';
import { Role } from '../enums/roles.enum';

// Use the explicit Role enum types here instead of generic string[]
export const Roles = Reflector.createDecorator<Role[]>();