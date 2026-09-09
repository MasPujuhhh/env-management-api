import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';

import { JwtGuard } from '../auth/auth.guard';

import { ApiKeyDto } from './dto/api-key.dto';
import { ApiKeysService } from './api-keys.service';

@UseGuards(JwtGuard)
@Controller('repositories/:repositoryId/api-keys')
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Get()
  list(@Param('repositoryId') repositoryId: string, @Req() req: any) {
    return this.service.list(repositoryId, req.user);
  }

  @Post()
  create(@Param('repositoryId') repositoryId: string, @Body() dto: ApiKeyDto, @Req() req: any) {
    return this.service.create(repositoryId, dto, req.user);
  }

  @Delete(':keyId')
  revoke(
    @Param('repositoryId') repositoryId: string,
    @Param('keyId') keyId: string,
    @Req() req: any,
  ) {
    return this.service.revoke(repositoryId, keyId, req.user);
  }
}
