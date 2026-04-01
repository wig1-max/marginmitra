import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { CsvUploadScreen } from '../src/components/CsvUploadScreen';
import { useRequireAuth } from '../src/hooks/useRequireAuth';

export default function UploadRoute() {
  const { sessionUser } = useRequireAuth();

  if (!sessionUser) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <CsvUploadScreen />
    </AppErrorBoundary>
  );
}

