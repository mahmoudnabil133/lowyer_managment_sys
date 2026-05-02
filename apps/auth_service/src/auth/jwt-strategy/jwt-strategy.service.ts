import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  email: string;
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategyService extends PassportStrategy(Strategy){
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.access_secret,
    });
}

  async validate(payload:JwtPayload){
    return { email: payload.email, userId: payload.sub, role: payload.role };
  }
}
