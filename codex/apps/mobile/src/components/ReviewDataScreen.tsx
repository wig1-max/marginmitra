import { CsvFieldKey } from '@marginmitra/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { commitReviewedDraft } from '../lib/api';
import { useIngestionDraft } from '../providers/IngestionDraftProvider';
import { colors, spacing } from '../theme/tokens';

type DraftCorrectionState = Record<string, Record<CsvFieldKey, string>>;

export function ReviewDataScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ draftId?: string }>();
  const { draft, loadDraft, setDraft } = useIngestionDraft();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftCorrections, setDraftCorrections] = useState<DraftCorrectionState>({});

  useEffect(() => {
    async function ensureDraftLoaded() {
      if (draft && (!params.draftId || draft.draftId === params.draftId)) {
        return;
      }

      if (!params.draftId) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        await loadDraft(params.draftId);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load the review draft.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    void ensureDraftLoaded();
  }, [draft, loadDraft, params.draftId]);

  const reviewRows = useMemo(() => draft?.flaggedRows ?? [], [draft?.flaggedRows]);

  function updateCell(
    clientRowId: string,
    field: CsvFieldKey,
    value: string
  ) {
    setDraftCorrections((current) => ({
      ...current,
      [clientRowId]: {
        ...(current[clientRowId] ?? {}),
        [field]: value
      }
    }));
  }

  async function handleSubmit() {
    if (!draft) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const corrections = Object.entries(draftCorrections).map(([clientRowId, values]) => ({
        clientRowId,
        values
      }));
      const response = await commitReviewedDraft(draft.draftId, corrections);
      setDraft({
        ...draft,
        status: 'READY_TO_COMMIT',
        flaggedRows: [],
        preview: response.preview
      });
      router.replace('/');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to commit the reviewed rows.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centeredRoot}>
        <ActivityIndicator size="large" color={colors.ink900} />
        <Text style={styles.helperText}>Loading flagged rows...</Text>
      </SafeAreaView>
    );
  }

  if (!draft) {
    return (
      <SafeAreaView style={styles.centeredRoot}>
        <Text style={styles.title}>No review draft is loaded</Text>
        <Text style={styles.helperText}>
          Upload a CSV first, then we will bring you back here if any rows need help.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Fix the flagged rows</Text>
        <Text style={styles.subtitle}>
          We found {reviewRows.length} rows that need manual confirmation before we
          finalize the payout math.
        </Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {reviewRows.map((row) => (
          <View key={row.clientRowId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>Row {row.rowNumber}</Text>
            {row.editableCells.map((cell) => (
              <View key={`${row.clientRowId}-${cell.standardField}`} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {cell.standardField.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.fieldMeta}>
                  Issue: {cell.issue.replace(/_/g, ' ')}
                </Text>
                <TextInput
                  defaultValue={
                    draftCorrections[row.clientRowId]?.[cell.standardField] ??
                    cell.suggestedValue ??
                    cell.rawValue ??
                    ''
                  }
                  onChangeText={(value) =>
                    updateCell(row.clientRowId, cell.standardField, value)
                  }
                  placeholder="Type the corrected value"
                  placeholderTextColor={colors.slate}
                  style={styles.input}
                />
              </View>
            ))}
          </View>
        ))}

        <Pressable
          disabled={isSubmitting}
          onPress={() => void handleSubmit()}
          style={styles.primaryButton}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Confirm and finalize import</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  centeredRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md
  },
  title: {
    color: colors.ink900,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.ink700,
    fontSize: 15,
    lineHeight: 22
  },
  helperText: {
    color: colors.ink700,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'center'
  },
  errorText: {
    color: colors.danger
  },
  rowCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.lg
  },
  rowTitle: {
    color: colors.ink900,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm
  },
  fieldGroup: {
    marginBottom: spacing.md
  },
  fieldLabel: {
    color: colors.ink900,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs
  },
  fieldMeta: {
    color: colors.amber,
    fontSize: 12,
    marginBottom: spacing.xs
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 16,
    color: colors.ink900,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink900,
    borderRadius: 999,
    marginTop: spacing.sm,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  }
});
