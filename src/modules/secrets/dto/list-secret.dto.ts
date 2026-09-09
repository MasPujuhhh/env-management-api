import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ListSecretDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value;
    }
    return value.split(',');
  })
  @IsArray()
  @IsString({ each: true })
  types?: string[];
}
