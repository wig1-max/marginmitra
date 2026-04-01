import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuthSession } from '../providers/AuthSessionProvider';

export function useRequireAuth() {
  const router = useRouter();
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.isHydrating && !auth.sessionUser) {
      router.replace('/sign-in');
    }
  }, [auth.isHydrating, auth.sessionUser, router]);

  return auth;
}

