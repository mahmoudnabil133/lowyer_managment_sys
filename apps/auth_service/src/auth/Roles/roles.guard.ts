import { Reflector } from '@nestjs/core';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements  CanActivate{
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean{
    let roles: string[] = this.reflector.getAllAndMerge<string[]>(Roles, [context.getHandler(), context.getClass()]);
    if (!roles || roles.length === 0) {
      return true;
    }
    let request = context.switchToHttp().getRequest();
    let user = request.user;

    return roles.includes(user.role);
  }
}