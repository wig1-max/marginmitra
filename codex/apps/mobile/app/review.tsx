import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { ReviewDataScreen } from '../src/components/ReviewDataScreen';
import { useRequireAuth } from '../src/hooks/useRequireAuth';

export default function ReviewRoute() {
  const { sessionUser } = useRequireAuth();

  if (!sessionUser) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <ReviewDataScreen />
    </AppErrorBoundary>
  );
}
