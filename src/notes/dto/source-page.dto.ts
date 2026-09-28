import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SourcePageDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  faviconUrl?: string;
}
