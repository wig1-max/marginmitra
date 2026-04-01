import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExchangeTokenDto } from './dto/exchange-token.dto';
import { ReviewerLoginDto } from './dto/reviewer-login.dto';
import { AppAuthGuard } from './guards/app-auth.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('exchange')
  exchange(@Body() dto: ExchangeTokenDto) {
    return this.authService.exchangeFirebaseToken(dto.firebaseIdToken);
  }

  @Post('reviewer-login')
  reviewerLogin(@Body() dto: ReviewerLoginDto) {
    return this.authService.reviewerLogin(dto.phoneNumber, dto.otp);
  }

  @UseGuards(AppAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser | undefined) {
    return {
      user
    };
  }
}

