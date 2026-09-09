import { IsOptional, IsString } from 'class-validator';
export class RepositoryGroupDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() description?: string;
}
