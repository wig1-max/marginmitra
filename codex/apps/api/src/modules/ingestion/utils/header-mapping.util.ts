import { CsvFieldKey } from '@marginmitra/shared';

const FIELD_ALIASES: Record<CsvFieldKey, string[]> = {
  order_id: ['order id', 'order_id', 'order number', 'reference id'],
  gross_sales_paise: [
    'gross order value',
    'gross value',
    'order amount',
    'bill amount',
    'order total'
  ],
  actual_payout_paise: [
    'net payout',
    'settled amount',
    'bank transfer',
    'net payable',
    'final payout'
  ],
  commission_paise: ['commission', 'platform commission', 'service fee'],
  payment_gateway_fee_paise: [
    'pg fee',
    'pg charges',
    'payment gateway fee',
    'gateway charges'
  ],
  ad_spend_paise: ['ads', 'ad spend', 'promotion spend', 'marketing spend'],
  cancellation_penalty_paise: [
    'cancellation penalty',
    'cancel penalty',
    'delay penalty'
  ],
  seller_discount_paise: [
    'merchant funded discount',
    'restaurant funded discount',
    'seller discount',
    'merchant discount'
  ],
  gst_on_services_paise: [
    'gst on services',
    'gst on commission',
    'gst charged',
    'service gst'
  ],
  tax_collected_at_source_paise: ['tcs', 'tax collected at source'],
  tax_deducted_at_source_paise: ['tds', 'tax deducted at source'],
  platform_fixed_fee_paise: ['fixed fee', 'packaging fee', 'service charges'],
  other_adjustments_paise: ['adjustment', 'misc deduction', 'other deduction'],
  order_date_iso: ['order date', 'created at', 'placed at'],
  settlement_date_iso: ['settlement date', 'settled at', 'payout date'],
  status: ['status', 'order status']
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function overlapScore(left: string, right: string): number {
  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.92;
  }

  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  const sharedCount = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return sharedCount / Math.max(leftTokens.size, rightTokens.size, 1);
}

export interface HeaderMatchResult {
  sourceHeader: string;
  confidence: number;
}

export function buildHeaderMapping(
  headers: string[]
): Partial<Record<CsvFieldKey, HeaderMatchResult>> {
  const mapping: Partial<Record<CsvFieldKey, HeaderMatchResult>> = {};

  for (const header of headers) {
    const normalizedHeader = normalizeHeader(header);

    let bestField: CsvFieldKey | null = null;
    let bestScore = 0;

    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
      CsvFieldKey,
      string[]
    ][]) {
      for (const alias of aliases) {
        const score = overlapScore(normalizedHeader, normalizeHeader(alias));

        if (score > bestScore) {
          bestField = field;
          bestScore = score;
        }
      }
    }

    if (!bestField || bestScore < 0.56) {
      continue;
    }

    const existing = mapping[bestField];
    if (!existing || bestScore > existing.confidence) {
      mapping[bestField] = {
        sourceHeader: header,
        confidence: bestScore
      };
    }
  }

  return mapping;
}

