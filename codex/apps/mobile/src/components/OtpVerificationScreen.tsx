import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { useAuthSession } from '../providers/AuthSessionProvider';
import { colors, spacing } from '../theme/tokens';

export function OtpVerificationScreen() {
  const router = useRouter();
  const {
    isAuthenticating,
    pendingVerification,
    sessionUser,
    verifyOtp
  } = useAuthSession();
  const [otp, setOtp] = useState('123456');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sessionUser) {
      router.replace('/');
      return;
    }

    if (!pendingVerification) {
      router.replace('/sign-in');
    }
  }, [pendingVerification, router, sessionUser]);

  async function handleVerify() {
    setErrorMessage(null);

    try {
      await verifyOtp(otp.trim());
      router.replace('/');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to verify the OTP.'
      );
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Verify OTP</Text>
        <Text style={styles.title}>Enter the code from SMS</Text>
        <Text style={styles.body}>
          We use your verified number to attach a seller session to every CSV and
          reconciliation action.
        </Text>

        <Text style={styles.label}>One-time password</Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setOtp}
          placeholder="123456"
          placeholderTextColor={colors.slate}
          style={styles.input}
          value={otp}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          disabled={isAuthenticating}
          onPress={() => void handleVerify()}
          style={styles.primaryButton}
        >
          {isAuthenticating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Verify and continue</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: spacing.xl
  },
  eyebrow: {
    color: colors.ink700,
    fontSize: 14,
    marginBottom: spacing.sm
  },
  title: {
    color: colors.ink900,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    marginBottom: spacing.sm
  },
  body: {
    color: colors.ink700,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg
  },
  label: {
    color: colors.ink900,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    color: colors.ink900
  },
  errorText: {
    color: colors.danger,
    marginTop: spacing.sm
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink900,
    borderRadius: 999,
    marginTop: spacing.lg,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  }
});
