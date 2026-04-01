import { useRouter } from 'expo-router';
import { useState } from 'react';
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

export function PhoneAuthScreen() {
  const router = useRouter();
  const { requestOtp, isAuthenticating } = useAuthSession();
  const [phoneNumber, setPhoneNumber] = useState('+919999999999');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleContinue() {
    setErrorMessage(null);

    try {
      await requestOtp(phoneNumber.trim());
      router.push('/verify');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to start phone verification.'
      );
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>MarginMitra Sign In</Text>
        <Text style={styles.title}>Use your business phone number</Text>
        <Text style={styles.body}>
          Firebase phone auth is used for seller login. The Play review test number
          is prefilled here for easier QA.
        </Text>

        <Text style={styles.label}>Phone number</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="phone-pad"
          onChangeText={setPhoneNumber}
          placeholder="+91 9876543210"
          placeholderTextColor={colors.slate}
          style={styles.input}
          value={phoneNumber}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          disabled={isAuthenticating}
          onPress={() => void handleContinue()}
          style={styles.primaryButton}
        >
          {isAuthenticating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Send OTP</Text>
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
    fontSize: 16,
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

