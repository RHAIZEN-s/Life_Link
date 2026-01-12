import { IsEmail } from 'class-validator';

export class GetProfileDto {
  @IsEmail()
  email: string;
}
