import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../enums/roles.enum';

interface JwtPayload {
  email: string;
  sub: string;
  role: Role;
}

@Injectable()
export class JwtStrategyService extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.access_secret || 'fallback_secret', // Use uniform casing for envs
    });
  }

  async validate(payload: JwtPayload) {
    return { email: payload.email, userId: payload.sub, role: payload.role };
  }
}
