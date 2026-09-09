import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/auth.guard';

import { SecretDto } from './dto/secret.dto';
import { SyncSecretsDto } from './dto/sync-secrets.dto';

import { SecretsService } from './secrets.service';
import { ListSecretDto } from './dto/list-secret.dto';

@UseGuards(JwtGuard)
@Controller()
export class SecretsController {
  constructor(private readonly service: SecretsService) {}

  @Get('repositories/:repositoryId/secrets')
  list(@Param('repositoryId') id: string, @Query() query: ListSecretDto, @Req() req: any) {
    return this.service.list(id, req.user, query.types);
  }

  @Post('repositories/:repositoryId/secrets')
  add(@Param('repositoryId') repositoryId: string, @Body() dto: SecretDto, @Req() req: any) {
    return this.service.add(repositoryId, dto, req.user);
  }

  @Put('repositories/:repositoryId/secrets/sync')
  sync(@Param('repositoryId') repositoryId: string, @Body() dto: SyncSecretsDto, @Req() req: any) {
    return this.service.sync(repositoryId, dto, req.user);
  }

  @Patch('secrets/:secretId')
  edit(
    @Param('repositoryId') repositoryId: string,
    @Param('secretId') secretId: string,
    @Body() dto: SecretDto,
    @Req() req: any,
  ) {
    return this.service.edit(repositoryId, secretId, dto, req.user);
  }

  @Delete('secrets/:secretId')
  del(
    @Param('repositoryId') repositoryId: string,
    @Param('secretId') secretId: string,
    @Req() req: any,
  ) {
    return this.service.del(repositoryId, secretId, req.user);
  }
}
