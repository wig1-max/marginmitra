import { Stack } from 'expo-router';

import { AuthSessionProvider } from '../src/providers/AuthSessionProvider';
import { IngestionDraftProvider } from '../src/providers/IngestionDraftProvider';

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <IngestionDraftProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </IngestionDraftProvider>
    </AuthSessionProvider>
  );
}
