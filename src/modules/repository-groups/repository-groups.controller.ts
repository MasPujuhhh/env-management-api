import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/auth.guard';
import { RepositoryGroupDto } from './dto/repository-group.dto';
import { RepositoryGroupsService } from './repository-groups.service';
@UseGuards(JwtGuard)
@Controller()
export class RepositoryGroupsController {
  constructor(private readonly service: RepositoryGroupsService) {}

  @Post('workspaces/:workspaceId/repository-groups') create(
    @Param('workspaceId') id: string,
    @Body() d: RepositoryGroupDto,
    @Req() r: any,
  ) {
    return this.service.create(id, d, r.user);
  }

  @Get('workspaces/:workspaceId/repository-groups') list(
    @Param('workspaceId') id: string,
    @Req() r: any,
  ) {
    return this.service.list(id, r.user);
  }

  @Post('workspaces/:workspaceId/repository-groups/:groupId/duplicate') duplicate(
    @Param('workspaceId') workspaceId: string,
    @Param('groupId') groupId: string,
    @Req() r: any,
  ) {
    return this.service.duplicate(workspaceId, groupId, r.user);
  }

  @Get('repository-groups/:id') one(@Param('id') id: string, @Req() r: any) {
    return this.service.one(id, r.user);
  }

  @Patch('repository-groups/:id') update(
    @Param('id') id: string,
    @Body() d: RepositoryGroupDto,
    @Req() r: any,
  ) {
    return this.service.update(id, d, r.user);
  }

  @Delete('repository-groups/:id') remove(@Param('id') id: string, @Req() r: any) {
    return this.service.remove(id, r.user);
  }
}
