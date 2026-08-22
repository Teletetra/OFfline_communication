import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response=host.switchToHttp().getResponse<Response>(); const request=host.switchToHttp().getRequest<Request>();
    const status=exception instanceof HttpException ? exception.getStatus() : 500;
    response.status(status).json({ success:false, statusCode:status, message:exception instanceof Error ? exception.message : 'Internal server error', path:request.url, timestamp:new Date().toISOString() });
  }
}