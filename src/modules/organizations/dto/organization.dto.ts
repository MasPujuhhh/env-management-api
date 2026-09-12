import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
export class OrganizationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
}
export class OrganizationMemberDto {
  @IsEmail() email!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsIn(['MANAGER', 'USER']) role!: string;
}
