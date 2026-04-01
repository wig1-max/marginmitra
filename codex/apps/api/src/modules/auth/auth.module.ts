import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AppJwtService } from './app-jwt.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { AppAuthGuard } from './guards/app-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AppAuthGuard,
    AppJwtService,
    AuthService,
    FirebaseAdminService
  ],
  exports: [AppAuthGuard, AuthService]
})
export class AuthModule {}

