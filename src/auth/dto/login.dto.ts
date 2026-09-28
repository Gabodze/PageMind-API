import { IsEmail, IsString, MinLength } from 'class-validator';
// LoginDto defines the structure and validation rules for the login request payload.
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
