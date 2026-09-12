import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/auth.guard';
import { OrganizationDto, OrganizationMemberDto } from './dto/organization.dto';
import { OrganizationsService } from './organizations.service';

@UseGuards(JwtGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get() list(@Req() r: any) {
    return this.service.list(r.user);
  }

  @Post() create(@Body() d: OrganizationDto, @Req() r: any) {
    return this.service.create(d, r.user);
  }

  @Get(':id') get(@Param('id') id: string, @Req() r: any) {
    return this.service.get(id, r.user);
  }

  @Post(':id/duplicate') duplicate(@Param('id') id: string, @Req() r: any) {
    return this.service.duplicate(id, r.user);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() d: OrganizationDto, @Req() r: any) {
    return this.service.update(id, d, r.user);
  }

  @Delete(':id') remove(@Param('id') id: string, @Req() r: any) {
    return this.service.remove(id, r.user);
  }

  @Get(':id/members') members(@Param('id') id: string, @Req() r: any) {
    return this.service.members(id, r.user);
  }

  @Get(':id/assignable-users') assignableUsers(@Param('id') id: string, @Req() r: any) {
    return this.service.assignableUsers(id, r.user);
  }

  @Post(':id/members') addMember(
    @Param('id') id: string,
    @Body() d: OrganizationMemberDto,
    @Req() r: any,
  ) {
    return this.service.addMember(id, d, r.user);
  }
}
