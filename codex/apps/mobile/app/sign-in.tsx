import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { PhoneAuthScreen } from '../src/components/PhoneAuthScreen';
import { useAuthSession } from '../src/providers/AuthSessionProvider';

export default function SignInRoute() {
  const router = useRouter();
  const { isHydrating, sessionUser } = useAuthSession();

  useEffect(() => {
    if (!isHydrating && sessionUser) {
      router.replace('/');
    }
  }, [isHydrating, router, sessionUser]);

  return <PhoneAuthScreen />;
}

