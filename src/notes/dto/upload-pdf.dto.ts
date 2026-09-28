import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UploadPdfDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url?: string;
}
