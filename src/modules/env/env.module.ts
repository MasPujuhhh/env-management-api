import { Module } from '@nestjs/common';
import { EnvController } from './env.controller';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { CommonModule } from '../common/common.module';
@Module({ imports: [ApiKeysModule, CommonModule], controllers: [EnvController] })
export class EnvModule {}
