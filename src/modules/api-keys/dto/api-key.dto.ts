import { IsString, MinLength } from 'class-validator';
export class ApiKeyDto { @IsString() @MinLength(1) name!: string; }
