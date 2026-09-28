import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NoteType } from '../../generated/prisma/client';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { SourcePageDto } from './source-page.dto';

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  fileId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SourcePageDto)
  sourcePage?: SourcePageDto;
}
