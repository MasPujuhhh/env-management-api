import { Module } from "@nestjs/common";
import { HttpExceptionFilter } from "./http-exception.filter";
import { ResponseInterceptor } from "./response.interceptor";
import { EncryptionService } from "./encryption.service";

@Module({
  providers: [EncryptionService, HttpExceptionFilter, ResponseInterceptor],
  exports: [EncryptionService, HttpExceptionFilter, ResponseInterceptor],
})
export class CommonModule {}
