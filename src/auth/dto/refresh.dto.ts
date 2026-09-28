import { IsString, MinLength } from 'class-validator';
// RefreshDto defines the structure and validation rules for the refresh token request payload.
export class RefreshDto {
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
