import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class RepositoryDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
//   @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() repositoryGroupId?: string;
}
