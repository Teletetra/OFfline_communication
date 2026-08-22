import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
@Injectable()
export class LoggingInterceptor implements NestInterceptor { intercept(context:ExecutionContext,next:CallHandler):Observable<any>{ const started=Date.now(); return next.handle().pipe(tap(()=>console.log(`${context.getClass().name}.${context.getHandler().name} ${Date.now()-started}ms`))); } }