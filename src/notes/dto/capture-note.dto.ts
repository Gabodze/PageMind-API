import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CaptureNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsString()
  @MinLength(8)
  url!: string;

  @IsOptional()
  @IsString()
  folderId?: string;
}
