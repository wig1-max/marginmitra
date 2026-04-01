import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AppJwtService } from './app-jwt.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { AuthenticatedUser } from './interfaces/authenticated-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly appJwtService: AppJwtService,
    private readonly firebaseAdminService: FirebaseAdminService
  ) {}

  async exchangeFirebaseToken(firebaseIdToken: string) {
    const decodedToken = await this.firebaseAdminService.verifyIdToken(firebaseIdToken);
    const user = this.toUser(decodedToken.uid, decodedToken.phone_number, false);

    return {
      accessToken: this.appJwtService.sign(user),
      user
    };
  }

  reviewerLogin(phoneNumber: string, otp: string) {
    const expectedPhone =
      process.env.REVIEWER_TEST_PHONE_NUMBER ?? '+919999999999';
    const expectedOtp = process.env.REVIEWER_TEST_OTP ?? '123456';
    const allowBypass = process.env.ALLOW_REVIEWER_BYPASS !== 'false';

    if (!allowBypass || phoneNumber !== expectedPhone || otp !== expectedOtp) {
      throw new UnauthorizedException('Reviewer bypass credentials are invalid.');
    }

    const user = this.toUser('reviewer-bypass', phoneNumber, true);
    return {
      accessToken: this.appJwtService.sign(user),
      user
    };
  }

  authenticateBearerToken(token: string): Promise<AuthenticatedUser> | AuthenticatedUser {
    try {
      return this.appJwtService.verify(token);
    } catch {
      return this.firebaseAdminService.verifyIdToken(token).then((decodedToken) =>
        this.toUser(decodedToken.uid, decodedToken.phone_number, false)
      );
    }
  }

  private toUser(
    firebaseUid: string,
    phoneNumber: string | undefined,
    isReviewerBypass: boolean
  ): AuthenticatedUser {
    return {
      id: `usr_${firebaseUid}`,
      firebaseUid,
      phoneNumber,
      roles: ['seller'],
      isReviewerBypass
    };
  }
}

