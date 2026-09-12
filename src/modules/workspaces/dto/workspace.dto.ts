import { IsOptional, IsString } from 'class-validator';
export class WorkspaceDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
}
export class WorkspaceMemberDto {
  @IsString() userId!: string;
}
