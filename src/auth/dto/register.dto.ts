import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// RegisterDto defines the structure and validation rules for the registration request payload.
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
