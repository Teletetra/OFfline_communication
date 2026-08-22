import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status = exception.getStatus();
    const detail = exception.getResponse();
    response.status(status).json({ success:false, statusCode:status, message:detail, path:request.url, timestamp:new Date().toISOString() });
  }
}