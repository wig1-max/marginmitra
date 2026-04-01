export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  phoneNumber?: string;
  roles: string[];
  isReviewerBypass: boolean;
}

