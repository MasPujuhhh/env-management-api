import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {

    console.error('Exception caught by HttpExceptionFilter:', exception);

    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const raw =
      typeof body === 'string' ? body : (body as { message?: unknown }).message || 'Request failed';
    const errors = Array.isArray(raw) ? raw : null;
    const message = Array.isArray(raw) ? 'Validation failed' : String(raw);

    console.error({
        success: false,
        message,
        errors,
        metadata: { statusCode: status, path: request.url, timestamp: new Date().toISOString() },
        data: null,
      });

    response
      .status(status)
      .json({
        success: false,
        message,
        errors,
        metadata: { statusCode: status, path: request.url, timestamp: new Date().toISOString() },
        data: null,
      });
  }
}
