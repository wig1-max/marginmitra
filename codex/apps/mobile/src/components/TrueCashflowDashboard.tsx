import { ProfitPreviewResponse } from '@marginmitra/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { fetchTrueProfitPreview } from '../lib/api';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { colors, spacing } from '../theme/tokens';

function formatInrFromPaise(valuePaise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(valuePaise / 100);
}

export function TrueCashflowDashboard() {
  const router = useRouter();
  const { sessionUser, signOut } = useAuthSession();
  const [preview, setPreview] = useState<ProfitPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const livePreview = await fetchTrueProfitPreview();
        if (active) {
          setPreview(livePreview);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load the true profit preview.'
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.ink900} />
        <Text style={styles.loadingText}>Loading your true profit dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Today&apos;s Take-Home Cash</Text>
          <Text style={styles.heroValue}>
            {preview ? formatInrFromPaise(preview.summary.trueProfitPaise) : '--'}
          </Text>
          <Text style={styles.heroSubtext}>
            {sessionUser?.phoneNumber ?? 'Signed in seller'} · live reconciliation
          </Text>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Gross Sales</Text>
            <Text style={styles.metricValue}>
              {preview ? formatInrFromPaise(preview.summary.grossSalesPaise) : '--'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Deductions</Text>
            <Text style={styles.metricValue}>
              {preview
                ? formatInrFromPaise(preview.summary.totalDeductionsPaise)
                : '--'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Claimable Now</Text>
            <Text style={[styles.metricValue, styles.claimableValue]}>
              {preview
                ? formatInrFromPaise(preview.summary.claimsRecoverablePaise)
                : '--'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Profitable Orders</Text>
            <Text style={styles.metricValue}>
              {preview
                ? `${preview.summary.profitableOrderCount}/${preview.summary.orderCount}`
                : '--'}
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Refresh issue</Text>
            <Text style={styles.noticeBody}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => router.push('/upload')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Upload settlement CSV</Text>
          </Pressable>
          <Pressable
            onPress={() => void signOut()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>

        {preview?.orders.slice(0, 3).map((order) => (
          <View key={order.orderId} style={styles.orderCard}>
            <Text style={styles.orderPlatform}>{order.platform}</Text>
            <Text style={styles.orderValue}>
              {formatInrFromPaise(order.trueProfitPaise)}
            </Text>
            <Text style={styles.orderMeta}>
              Commission {formatInrFromPaise(order.deductions.commissionPaise)} | Ads{' '}
              {formatInrFromPaise(order.deductions.adSpendPaise)} | GST{' '}
              {formatInrFromPaise(order.deductions.gstPaise)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface
  },
  loadingText: {
    color: colors.ink700,
    marginTop: spacing.sm
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md
  },
  heroCard: {
    backgroundColor: colors.ink900,
    borderRadius: 28,
    padding: spacing.xl
  },
  eyebrow: {
    color: '#D9E2F2',
    fontSize: 14,
    marginBottom: spacing.sm
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800'
  },
  heroSubtext: {
    color: '#D9E2F2',
    fontSize: 15,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  metricCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: spacing.md
  },
  metricLabel: {
    color: colors.ink700,
    fontSize: 13,
    marginBottom: spacing.xs
  },
  metricValue: {
    color: colors.ink900,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700'
  },
  claimableValue: {
    color: colors.mint
  },
  noticeCard: {
    backgroundColor: '#F8E6E2',
    borderRadius: 20,
    padding: spacing.md
  },
  noticeTitle: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs
  },
  noticeBody: {
    color: '#6B2B2B',
    fontSize: 14,
    lineHeight: 20
  },
  actionRow: {
    gap: spacing.sm
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink900,
    borderRadius: 999,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: spacing.md
  },
  secondaryButtonText: {
    color: colors.ink900,
    fontSize: 15,
    fontWeight: '700'
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: spacing.lg
  },
  orderPlatform: {
    color: colors.ink700,
    fontSize: 13,
    marginBottom: spacing.xs
  },
  orderValue: {
    color: colors.ink900,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: spacing.xs
  },
  orderMeta: {
    color: colors.ink700,
    fontSize: 14,
    lineHeight: 20
  }
});
