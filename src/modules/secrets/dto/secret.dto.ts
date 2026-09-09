import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
export class SecretDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;
}
