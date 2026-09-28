import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class SummarizeDto {
  @IsString()
  @MinLength(20)
  content!: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsBoolean()
  saveToNote?: boolean;
}
