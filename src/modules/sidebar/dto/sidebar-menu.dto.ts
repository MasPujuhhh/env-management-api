import { IsOptional, IsString } from 'class-validator';

export class SidebarMenuQueryDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  // Cache-buster dari FE saat force refresh, diabaikan server.
  @IsOptional()
  @IsString()
  _t?: string;
}
