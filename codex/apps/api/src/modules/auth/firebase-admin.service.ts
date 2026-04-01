import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

@Injectable()
export class FirebaseAdminService {
  private app: admin.app.App | null = null;

  private getApp(): admin.app.App {
    if (this.app) {
      return this.app;
    }

    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      return this.app;
    }

    const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (!inlineJson && !serviceAccountPath) {
      throw new UnauthorizedException(
        'Firebase Admin is not configured on the API server.'
      );
    }

    const serviceAccount = inlineJson
      ? (JSON.parse(inlineJson) as admin.ServiceAccount)
      : (JSON.parse(
          readFileSync(resolve(serviceAccountPath as string), 'utf8')
        ) as admin.ServiceAccount);

    this.app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    return this.app;
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await this.getApp().auth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Firebase token verification failed.');
    }
  }
}

