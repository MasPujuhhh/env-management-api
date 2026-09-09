import { IsBoolean, IsString } from 'class-validator';
export class SyncSecretsDto {
  @IsString()
  content!: string;
}
