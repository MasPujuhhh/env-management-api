import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/auth.guard';
import { SidebarMenuQueryDto } from './dto/sidebar-menu.dto';
import { SidebarService } from './sidebar.service';

@UseGuards(JwtGuard)
@Controller('sidebar')
export class SidebarController {
  constructor(private readonly service: SidebarService) {}

  @Get('menu')
  @Header('Cache-Control', 'private, no-cache')
  menu(@Query() q: SidebarMenuQueryDto, @Req() r: any) {
    return this.service.getMenu(r.user, q.organizationId);
  }
}
