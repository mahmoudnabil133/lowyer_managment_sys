import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { tap } from 'rxjs/operators';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const correlationId = req.headers['x-correlation-id'] || uuidv4();
        req.correlationId = correlationId;
        return next.handle().pipe(
            tap(() => {
                const res = context.switchToHttp().getResponse();
                res.setHeader('x-correlation-id', correlationId);
            }),
        );
    }
}