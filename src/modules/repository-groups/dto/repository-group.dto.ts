import { IsOptional, IsString } from 'class-validator';
export class RepositoryGroupDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
}
