import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState
} from 'react';

import {
  exchangeFirebaseToken,
  fetchCurrentUser,
  reviewerLogin
} from '../lib/api';
import {
  clearStoredSessionToken,
  getStoredSessionToken,
  setStoredSessionToken
} from '../lib/secure-session';

interface SessionUser {
  id: string;
  firebaseUid: string;
  phoneNumber?: string;
  roles: string[];
  isReviewerBypass: boolean;
}

interface PendingVerification {
  phoneNumber: string;
  isReviewerBypass: boolean;
  confirmationResult: FirebaseAuthTypes.ConfirmationResult | null;
}

interface AuthSessionContextValue {
  sessionUser: SessionUser | null;
  isHydrating: boolean;
  isAuthenticating: boolean;
  pendingVerification: PendingVerification | null;
  requestOtp: (phoneNumber: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

const REVIEWER_PHONE =
  process.env.EXPO_PUBLIC_REVIEWER_TEST_PHONE_NUMBER ?? '+919999999999';

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pendingVerification, setPendingVerification] =
    useState<PendingVerification | null>(null);

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      try {
        const token = await getStoredSessionToken();

        if (!token) {
          if (active) {
            setIsHydrating(false);
          }
          return;
        }

        const user = await fetchCurrentUser();

        if (active) {
          setSessionUser(user);
          setIsHydrating(false);
        }
      } catch {
        await clearStoredSessionToken();

        if (active) {
          setSessionUser(null);
          setIsHydrating(false);
        }
      }
    }

    void hydrateSession();

    return () => {
      active = false;
    };
  }, []);

  async function requestOtp(phoneNumber: string) {
    setIsAuthenticating(true);

    try {
      if (phoneNumber === REVIEWER_PHONE) {
        setPendingVerification({
          phoneNumber,
          isReviewerBypass: true,
          confirmationResult: null
        });
        return;
      }

      const confirmationResult = await auth().signInWithPhoneNumber(phoneNumber);
      setPendingVerification({
        phoneNumber,
        isReviewerBypass: false,
        confirmationResult
      });
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function verifyOtp(otp: string) {
    if (!pendingVerification) {
      throw new Error('No active OTP session. Start with the phone number screen.');
    }

    setIsAuthenticating(true);

    try {
      if (pendingVerification.isReviewerBypass) {
        const session = await reviewerLogin(pendingVerification.phoneNumber, otp);
        await setStoredSessionToken(session.accessToken);
        setSessionUser(session.user);
        setPendingVerification(null);
        return;
      }

      if (!pendingVerification.confirmationResult) {
        throw new Error('Missing Firebase confirmation result.');
      }

      const userCredential = await pendingVerification.confirmationResult.confirm(otp);
      const firebaseIdToken = await userCredential.user.getIdToken();
      const session = await exchangeFirebaseToken(firebaseIdToken);

      await setStoredSessionToken(session.accessToken);
      setSessionUser(session.user);
      setPendingVerification(null);
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function signOut() {
    await clearStoredSessionToken();
    setSessionUser(null);
    setPendingVerification(null);

    try {
      await auth().signOut();
    } catch {
      // Firebase native auth may already be reset.
    }
  }

  return (
    <AuthSessionContext.Provider
      value={{
        sessionUser,
        isHydrating,
        isAuthenticating,
        pendingVerification,
        requestOtp,
        verifyOtp,
        signOut
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error('useAuthSession must be used inside AuthSessionProvider.');
  }

  return context;
}

