import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { commitReviewedDraft, uploadSettlementCsv } from '../lib/api';
import { useIngestionDraft } from '../providers/IngestionDraftProvider';
import { colors, spacing } from '../theme/tokens';

const FOOD_PLATFORMS = [
  { label: 'Swiggy', value: 'SWIGGY' as const },
  { label: 'Zomato', value: 'ZOMATO' as const }
];

export function CsvUploadScreen() {
  const router = useRouter();
  const { setDraft } = useIngestionDraft();
  const [selectedPlatform, setSelectedPlatform] = useState<'SWIGGY' | 'ZOMATO'>(
    'SWIGGY'
  );
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDisclosure, setShowDisclosure] = useState(false);

  async function handlePickAndUpload() {
    setErrorMessage(null);
    setShowDisclosure(false);

    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/csv',
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    setPickedFileName(asset.name ?? 'settlement.csv');
    setIsUploading(true);

    try {
      const draft = await uploadSettlementCsv(selectedPlatform, asset);
      setDraft(draft);

      if (draft.status === 'REQUIRES_REVIEW') {
        router.push({
          pathname: '/review',
          params: { draftId: draft.draftId }
        });
        return;
      }

      await commitReviewedDraft(draft.draftId, []);
      router.replace('/');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to upload the CSV.'
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <Modal animationType="slide" transparent visible={showDisclosure}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Before we open your file picker</Text>
            <Text style={styles.modalBody}>
              MarginMitra only reads the settlement CSV you choose so it can
              calculate platform fees, TCS, TDS, and payout leaks. We do not scan
              the rest of your device storage.
            </Text>
            <Pressable
              onPress={() => void handlePickAndUpload()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Choose CSV</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowDisclosure(false)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.card}>
        <Text style={styles.title}>Upload a settlement CSV</Text>
        <Text style={styles.body}>
          Swiggy and Zomato rely on CSV reconciliation, so this flow parses the
          payout sheet and stops for review if headers or deductions look wrong.
        </Text>

        <Text style={styles.sectionLabel}>Select platform</Text>
        <View style={styles.platformRow}>
          {FOOD_PLATFORMS.map((platform) => (
            <Pressable
              key={platform.value}
              onPress={() => setSelectedPlatform(platform.value)}
              style={[
                styles.platformChip,
                selectedPlatform === platform.value && styles.platformChipActive
              ]}
            >
              <Text
                style={[
                  styles.platformChipText,
                  selectedPlatform === platform.value && styles.platformChipTextActive
                ]}
              >
                {platform.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fileLabel}>
          {pickedFileName ? `Selected: ${pickedFileName}` : 'No file selected yet'}
        </Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          disabled={isUploading}
          onPress={() => setShowDisclosure(true)}
          style={styles.primaryButton}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Pick CSV and parse</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: spacing.xl
  },
  title: {
    color: colors.ink900,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: spacing.sm
  },
  body: {
    color: colors.ink700,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg
  },
  sectionLabel: {
    color: colors.ink900,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm
  },
  platformRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  platformChip: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  platformChipActive: {
    backgroundColor: colors.ink900,
    borderColor: colors.ink900
  },
  platformChipText: {
    color: colors.ink900,
    fontWeight: '700'
  },
  platformChipTextActive: {
    color: '#FFFFFF'
  },
  fileLabel: {
    color: colors.ink700,
    marginBottom: spacing.md
  },
  errorText: {
    color: colors.danger,
    marginBottom: spacing.sm
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
    marginTop: spacing.sm,
    paddingVertical: spacing.md
  },
  secondaryButtonText: {
    color: colors.ink900,
    fontSize: 15,
    fontWeight: '700'
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 33, 61, 0.45)',
    padding: spacing.lg
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: spacing.xl
  },
  modalTitle: {
    color: colors.ink900,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: spacing.sm
  },
  modalBody: {
    color: colors.ink700,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg
  }
});
