import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/auth.guard';
import { PaginationDto } from '../common/pagination.dto';
import { RepositoryDto } from './dto/repository.dto';
import { RepositoriesService } from './repositories.service';

@UseGuards(JwtGuard)
@Controller()
export class RepositoriesController {
  constructor(private readonly service: RepositoriesService) {}

  @Get('repository-groups/:groupId/repositories')
  listByGroup(
    @Param('groupId') groupId: string,
    @Query() pagination: PaginationDto,
    @Req() req: any,
  ) {
    return this.service.listByGroup(groupId, req.user, pagination);
  }

  @Post('repository-groups/:groupId/repositories')
  create(@Param('groupId') groupId: string, @Body() dto: RepositoryDto, @Req() req: any) {
    return this.service.create(groupId, dto, req.user);
  }

  @Get('repositories/:id')
  one(@Param('id') id: string, @Req() req: any) {
    return this.service.one(id, req.user);
  }

  @Post('repositories/:id/duplicate')
  duplicate(@Param('id') id: string, @Req() req: any) {
    return this.service.duplicate(id, req.user);
  }

  @Patch('repositories/:id')
  update(@Param('id') id: string, @Body() dto: RepositoryDto, @Req() req: any) {
    return this.service.update(id, dto, req.user);
  }

  @Delete('repositories/:id')
  del(@Param('id') id: string, @Req() req: any) {
    return this.service.del(id, req.user);
  }
}
