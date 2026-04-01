import { IsString } from 'class-validator';

export class ReviewerLoginDto {
  @IsString()
  phoneNumber!: string;

  @IsString()
  otp!: string;
}

