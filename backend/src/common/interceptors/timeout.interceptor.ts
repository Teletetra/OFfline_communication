import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { Observable, timeout, catchError, throwError } from 'rxjs';
@Injectable()
export class TimeoutInterceptor implements NestInterceptor { constructor(private readonly ms=15000){} intercept(_context:ExecutionContext,next:CallHandler):Observable<any>{ return next.handle().pipe(timeout(this.ms),catchError(err=>err.name==='TimeoutError'?throwError(()=>new RequestTimeoutException()):throwError(()=>err))); } }