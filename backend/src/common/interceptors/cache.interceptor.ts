import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
@Injectable()
export class CacheInterceptor implements NestInterceptor { intercept(_context:ExecutionContext,next:CallHandler):Observable<any>{ return next.handle(); } }