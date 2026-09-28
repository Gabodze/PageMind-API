import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  type?: 'SUMMARY' | 'HIGHLIGHT' | 'FULL_PAGE' | 'PDF';

  @IsOptional()
  @IsString()
  folderId?: string | null;
}
