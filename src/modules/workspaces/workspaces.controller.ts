import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/auth.guard';
import { WorkspaceDto, WorkspaceMemberDto } from './dto/workspace.dto';
import { WorkspacesService } from './workspaces.service';
@UseGuards(JwtGuard)
@Controller()
export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}
  
  @Post('organizations/:organizationId/workspaces') create(
    @Param('organizationId') id: string,
    @Body() d: WorkspaceDto,
    @Req() r: any,
  ) {
    return this.service.create(id, d, r.user);
  }

  @Get('organizations/:organizationId/workspaces') list(
    @Param('organizationId') id: string,
    @Req() r: any,
  ) {
    return this.service.list(id, r.user);
  }

  @Get('organizations/:organizationId/workspaces/:workspaceId') get(
    @Param('workspaceId') id: string,
    @Req() r: any,
  ) {
    return this.service.get(id, r.user);
  }

  @Post('organizations/:organizationId/workspaces/:workspaceId/duplicate') duplicate(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Req() r: any,
  ) {
    return this.service.duplicate(organizationId, workspaceId, r.user);
  }

  @Patch('organizations/:organizationId/workspaces/:workspaceId') update(
    @Param('workspaceId') id: string,
    @Body() d: WorkspaceDto,
    @Req() r: any,
  ) {
    return this.service.update(id, d, r.user);
  }

  @Delete('organizations/:organizationId/workspaces/:workspaceId') remove(
    @Param('workspaceId') id: string,
    @Req() r: any,
  ) {
    return this.service.remove(id, r.user);
  }

  @Get('workspaces/:workspaceId/members') members(@Param('workspaceId') id: string, @Req() r: any) {
    return this.service.members(id, r.user);
  }

  @Post('workspaces/:workspaceId/members') addMember(
    @Param('workspaceId') id: string,
    @Body() d: WorkspaceMemberDto,
    @Req() r: any,
  ) {
    return this.service.addMember(id, d.userId, r.user);
  }
  
  @Delete('workspaces/:workspaceId/members/:memberId') removeMember(
    @Param('workspaceId') id: string,
    @Param('memberId') memberId: string,
    @Req() r: any,
  ) {
    return this.service.removeMember(id, memberId, r.user);
  }
}
