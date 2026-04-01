import { Injectable, UnauthorizedException } from '@nestjs/common';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { AuthenticatedUser } from './interfaces/authenticated-user';

interface SessionPayload extends JwtPayload {
  sub: string;
  firebaseUid: string;
  phoneNumber?: string;
  roles: string[];
  isReviewerBypass: boolean;
}

@Injectable()
export class AppJwtService {
  private readonly secret =
    process.env.APP_JWT_SECRET ?? 'marginmitra-dev-session-secret';

  sign(user: AuthenticatedUser): string {
    return jwt.sign(
      {
        sub: user.id,
        firebaseUid: user.firebaseUid,
        phoneNumber: user.phoneNumber,
        roles: user.roles,
        isReviewerBypass: user.isReviewerBypass
      } satisfies SessionPayload,
      this.secret,
      {
        expiresIn: '7d',
        issuer: 'marginmitra-api',
        audience: 'marginmitra-mobile'
      }
    );
  }

  verify(token: string): AuthenticatedUser {
    try {
      const payload = jwt.verify(token, this.secret, {
        issuer: 'marginmitra-api',
        audience: 'marginmitra-mobile'
      }) as SessionPayload;

      return {
        id: payload.sub,
        firebaseUid: payload.firebaseUid,
        phoneNumber: payload.phoneNumber,
        roles: payload.roles ?? [],
        isReviewerBypass: payload.isReviewerBypass ?? false
      };
    } catch {
      throw new UnauthorizedException('Invalid app session token.');
    }
  }
}

