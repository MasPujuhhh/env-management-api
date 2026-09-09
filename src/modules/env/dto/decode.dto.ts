import { IsNotEmpty, IsString } from 'class-validator';

export class DecodeEnvDto {
  @IsString()
  @IsNotEmpty()
  data!: string;
}
