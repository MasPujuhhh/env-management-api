import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
export class RepositoryDto { @IsString() @MinLength(1) @MaxLength(100) name!: string; @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() repositoryGroupId?: string; }
