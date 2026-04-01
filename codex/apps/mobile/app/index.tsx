import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { TrueCashflowDashboard } from '../src/components/TrueCashflowDashboard';
import { useRequireAuth } from '../src/hooks/useRequireAuth';

export default function HomeScreen() {
  const router = useRouter();
  const { isHydrating, sessionUser } = useRequireAuth();

  useEffect(() => {
    if (!isHydrating && !sessionUser) {
      router.replace('/sign-in');
    }
  }, [isHydrating, router, sessionUser]);

  if (!sessionUser) {
    return null;
  }

  return <TrueCashflowDashboard />;
}

