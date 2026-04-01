import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  CommitReviewInput,
  CommitReviewResponse,
  CsvFieldKey,
  FlaggedCell,
  FlaggedRow,
  IngestionDraft,
  MarketplacePlatform,
  previewTrueProfit,
  StandardizedOrderInput
} from '@marginmitra/shared';
import { randomUUID } from 'node:crypto';
import Papa from 'papaparse';

import {
  buildHeaderMapping,
  HeaderMatchResult
} from './utils/header-mapping.util';

interface DraftRowState {
  clientRowId: string;
  rowNumber: number;
  platform: MarketplacePlatform;
  rawRow: Record<string, string>;
  fieldValues: Partial<Record<CsvFieldKey, string>>;
  flaggedCells: FlaggedCell[];
}

interface StoredDraft {
  draft: IngestionDraft;
  rows: DraftRowState[];
}

@Injectable()
export class IngestionService {
  private readonly drafts = new Map<string, StoredDraft>();

  uploadCsv(fileBuffer: Buffer, platform: MarketplacePlatform): IngestionDraft {
    const csvText = fileBuffer.toString('utf8');
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true
    });

    if (parsed.errors.length > 0) {
      throw new BadRequestException(parsed.errors[0]?.message ?? 'CSV parsing failed.');
    }

    const headers = parsed.meta.fields ?? [];
    const mapping = buildHeaderMapping(headers);
    const draftId = randomUUID();

    const rows = parsed.data.map((row, index) =>
      this.buildDraftRow(platform, index + 1, row, mapping)
    );

    const normalizedOrders = rows
      .filter((row) => row.flaggedCells.length === 0)
      .map((row) => this.buildOrderFromFieldValues(platform, row.fieldValues, row.rowNumber));

    const flaggedRows = rows
      .filter((row) => row.flaggedCells.length > 0)
      .map<FlaggedRow>((row) => ({
        clientRowId: row.clientRowId,
        rowNumber: row.rowNumber,
        platform: row.platform,
        rawRow: row.rawRow,
        editableCells: row.flaggedCells
      }));

    const draft: IngestionDraft = {
      draftId,
      platform,
      status: flaggedRows.length > 0 ? 'REQUIRES_REVIEW' : 'READY_TO_COMMIT',
      totalRows: rows.length,
      flaggedRows,
      normalizedOrders,
      preview: previewTrueProfit(normalizedOrders)
    };

    this.drafts.set(draftId, {
      draft,
      rows
    });

    return draft;
  }

  getDraft(draftId: string): IngestionDraft {
    const storedDraft = this.drafts.get(draftId);

    if (!storedDraft) {
      throw new NotFoundException('Review draft not found.');
    }

    return storedDraft.draft;
  }

  commit(input: CommitReviewInput): CommitReviewResponse {
    const storedDraft = this.drafts.get(input.draftId);

    if (!storedDraft) {
      throw new NotFoundException('Review draft not found.');
    }

    const rowsById = new Map(
      storedDraft.rows.map((row) => [row.clientRowId, row] as const)
    );

    for (const correction of input.corrections) {
      const row = rowsById.get(correction.clientRowId);

      if (!row) {
        continue;
      }

      row.fieldValues = {
        ...row.fieldValues,
        ...correction.values
      };
      row.flaggedCells = [];
    }

    const committedOrders = storedDraft.rows.map((row) =>
      this.buildOrderFromFieldValues(
        row.platform,
        row.fieldValues,
        row.rowNumber,
        true
      )
    );

    const preview = previewTrueProfit(committedOrders);
    storedDraft.draft = {
      ...storedDraft.draft,
      status: 'READY_TO_COMMIT',
      flaggedRows: [],
      normalizedOrders: committedOrders,
      preview
    };

    return {
      status: 'COMMITTED',
      committedOrderCount: committedOrders.length,
      preview
    };
  }

  private buildDraftRow(
    platform: MarketplacePlatform,
    rowNumber: number,
    rawRow: Record<string, string>,
    mapping: Partial<Record<CsvFieldKey, HeaderMatchResult>>
  ): DraftRowState {
    const fieldValues: Partial<Record<CsvFieldKey, string>> = {};
    const flaggedCells: FlaggedCell[] = [];

    for (const [field, match] of Object.entries(mapping) as [
      CsvFieldKey,
      HeaderMatchResult
    ][]) {
      const rawValue = rawRow[match.sourceHeader];
      fieldValues[field] = rawValue?.trim() ?? '';

      if (match.confidence < 0.72) {
        flaggedCells.push({
          standardField: field,
          issue: 'LOW_CONFIDENCE_FIELD',
          sourceHeader: match.sourceHeader,
          rawValue,
          suggestedValue: rawValue
        });
      }
    }

    const requiredFields: CsvFieldKey[] = [
      'order_id',
      'gross_sales_paise',
      'actual_payout_paise',
      'order_date_iso',
      'status'
    ];

    for (const requiredField of requiredFields) {
      if (!fieldValues[requiredField]) {
        flaggedCells.push({
          standardField: requiredField,
          issue: 'MISSING_REQUIRED_VALUE'
        });
      }
    }

    for (const numericField of [
      'gross_sales_paise',
      'actual_payout_paise',
      'commission_paise',
      'payment_gateway_fee_paise',
      'ad_spend_paise',
      'cancellation_penalty_paise',
      'seller_discount_paise',
      'gst_on_services_paise',
      'tax_collected_at_source_paise',
      'tax_deducted_at_source_paise',
      'platform_fixed_fee_paise',
      'other_adjustments_paise'
    ] as CsvFieldKey[]) {
      const value = fieldValues[numericField];
      if (value && Number.isNaN(this.parseCurrencyToPaise(value))) {
        flaggedCells.push({
          standardField: numericField,
          issue: 'INVALID_NUMBER',
          rawValue: value,
          suggestedValue: value
        });
      }
    }

    return {
      clientRowId: randomUUID(),
      rowNumber,
      platform,
      rawRow,
      fieldValues,
      flaggedCells
    };
  }

  private buildOrderFromFieldValues(
    platform: MarketplacePlatform,
    fieldValues: Partial<Record<CsvFieldKey, string>>,
    rowNumber: number,
    strict = false
  ): StandardizedOrderInput {
    const getMoneyField = (field: CsvFieldKey) => {
      const rawValue = fieldValues[field];

      if (!rawValue) {
        return 0;
      }

      const parsedValue = this.parseCurrencyToPaise(rawValue);
      if (Number.isNaN(parsedValue)) {
        if (strict) {
          throw new BadRequestException(
            `Row ${rowNumber} has an invalid value for ${field}.`
          );
        }

        return 0;
      }

      return parsedValue;
    };

    const orderId = fieldValues.order_id?.trim();
    const orderDateIso = this.parseDate(
      fieldValues.order_date_iso,
      `2026-04-01T00:00:00.000Z`
    );
    const settlementDateIso = fieldValues.settlement_date_iso
      ? this.parseDate(fieldValues.settlement_date_iso, orderDateIso)
      : undefined;
    const status = this.normalizeStatus(fieldValues.status);

    if (strict && !orderId) {
      throw new BadRequestException(`Row ${rowNumber} is missing an order ID.`);
    }

    const businessVertical =
      platform === 'SWIGGY' || platform === 'ZOMATO'
        ? 'FOOD_DELIVERY'
        : 'ECOMMERCE';
    const grossSalesPaise = getMoneyField('gross_sales_paise');
    const sellerDiscountPaise = getMoneyField('seller_discount_paise');
    const commissionPaise = getMoneyField('commission_paise');
    const paymentGatewayFeePaise = getMoneyField('payment_gateway_fee_paise');
    const cancellationPenaltyPaise = getMoneyField('cancellation_penalty_paise');
    const gstOnServicesPaise = getMoneyField('gst_on_services_paise');
    const taxCollectedAtSourcePaise = getMoneyField('tax_collected_at_source_paise');
    const taxDeductedAtSourcePaise = getMoneyField('tax_deducted_at_source_paise');
    const fixedPlatformFeePaise = getMoneyField('platform_fixed_fee_paise');
    const otherAdjustmentsPaise = getMoneyField('other_adjustments_paise');
    const actualPayoutPaise = getMoneyField('actual_payout_paise');

    const commissionRateBps =
      grossSalesPaise > 0 ? Math.round((commissionPaise * 10_000) / grossSalesPaise) : 0;
    const taxableServiceBase =
      commissionPaise +
      paymentGatewayFeePaise +
      fixedPlatformFeePaise +
      cancellationPenaltyPaise;
    const gstRateBps =
      taxableServiceBase > 0
        ? Math.round((gstOnServicesPaise * 10_000) / taxableServiceBase)
        : 1800;

    return {
      orderId: orderId ?? `ROW-${rowNumber}`,
      platform,
      businessVertical,
      orderDateIso,
      settlementDateIso,
      status,
      currency: 'INR',
      grossSalesPaise,
      sellerDiscountPaise,
      adSpendPaise: getMoneyField('ad_spend_paise'),
      paymentGatewayFeePaise,
      fixedPlatformFeePaise,
      commissionRateBps,
      commissionPaise,
      expectedRtoRateBps: 0,
      packageWeightGrams: 500,
      shippingZone: 'LOCAL',
      gstRateBps,
      gstOnServicesPaise,
      cancellationPenaltyPaise,
      taxCollectedAtSourcePaise,
      taxDeductedAtSourcePaise,
      otherAdjustmentsPaise,
      actualPayoutPaise
    };
  }

  private parseCurrencyToPaise(value: string): number {
    const normalizedValue = value
      .replace(/[,\s\u20b9]/g, '')
      .replace(/\((.*)\)/, '-$1')
      .trim();

    if (!normalizedValue) {
      return 0;
    }

    const parsed = Number(normalizedValue);
    if (Number.isNaN(parsed)) {
      return Number.NaN;
    }

    return Math.round(parsed * 100);
  }

  private normalizeStatus(value: string | undefined) {
    const normalizedValue = (value ?? '').toLowerCase();

    if (normalizedValue.includes('cancel')) {
      return 'CANCELLED' as const;
    }

    if (normalizedValue.includes('rto')) {
      return 'RTO' as const;
    }

    if (normalizedValue.includes('return')) {
      return 'RETURNED' as const;
    }

    if (
      normalizedValue.includes('deliver') ||
      normalizedValue.includes('complete') ||
      normalizedValue.includes('settled')
    ) {
      return 'DELIVERED' as const;
    }

    return 'IN_TRANSIT' as const;
  }

  private parseDate(value: string | undefined, fallbackIso: string) {
    if (!value) {
      return fallbackIso;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return fallbackIso;
    }

    return parsed.toISOString();
  }

  private parseMoneyToPaise(value: string): number {
    const normalizedValue = value
      .replace(/[,\s₹]/g, '')
      .replace(/\((.*)\)/, '-$1')
      .trim();

    if (!normalizedValue) {
      return 0;
    }

    const parsed = Number(normalizedValue);
    if (Number.isNaN(parsed)) {
      return Number.NaN;
    }

    return Math.round(parsed * 100);
  }
}
