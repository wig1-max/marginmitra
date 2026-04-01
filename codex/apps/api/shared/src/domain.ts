export const marketplacePlatforms = [
  'AMAZON',
  'FLIPKART',
  'MEESHO',
  'ONDC',
  'INSTAGRAM',
  'SHOPIFY',
  'SWIGGY',
  'ZOMATO'
] as const;

export type MarketplacePlatform = (typeof marketplacePlatforms)[number];

export const businessVerticals = ['ECOMMERCE', 'FOOD_DELIVERY'] as const;
export type BusinessVertical = (typeof businessVerticals)[number];

export const shippingZones = ['LOCAL', 'REGIONAL', 'NATIONAL'] as const;
export type ShippingZone = (typeof shippingZones)[number];

export const orderStatuses = [
  'DELIVERED',
  'RTO',
  'RETURNED',
  'CANCELLED',
  'IN_TRANSIT'
] as const;

export type StandardizedOrderStatus = (typeof orderStatuses)[number];

export const discrepancyTypes = [
  'MISSING_PAYOUT',
  'OVERCHARGED_SHIPPING',
  'UNJUSTIFIED_RTO',
  'HIGH_PLATFORM_COMMISSION',
  'UNMAPPED_DEDUCTION'
] as const;

export type DiscrepancyType = (typeof discrepancyTypes)[number];

export const csvFieldKeys = [
  'order_id',
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
  'other_adjustments_paise',
  'order_date_iso',
  'settlement_date_iso',
  'status'
] as const;

export type CsvFieldKey = (typeof csvFieldKeys)[number];

export interface StandardizedOrderInput {
  orderId: string;
  platform: MarketplacePlatform;
  businessVertical: BusinessVertical;
  orderDateIso: string;
  settlementDateIso?: string;
  status: StandardizedOrderStatus;
  currency: 'INR';
  grossSalesPaise: number;
  sellerDiscountPaise: number;
  adSpendPaise: number;
  paymentGatewayFeePaise: number;
  fixedPlatformFeePaise: number;
  commissionRateBps: number;
  commissionPaise?: number;
  expectedRtoRateBps: number;
  packageWeightGrams: number;
  shippingZone: ShippingZone;
  forwardShippingFeePaise?: number;
  reverseShippingFeePaise?: number;
  gstRateBps: number;
  gstOnServicesPaise?: number;
  cancellationPenaltyPaise?: number;
  taxCollectedAtSourcePaise?: number;
  taxDeductedAtSourcePaise?: number;
  otherAdjustmentsPaise?: number;
  actualPayoutPaise?: number;
}

export interface OrderDeductionBreakdown {
  commissionPaise: number;
  forwardShippingPaise: number;
  reverseShippingPaise: number;
  paymentGatewayFeePaise: number;
  platformFixedFeePaise: number;
  expectedRtoReservePaise: number;
  cancellationPenaltyPaise: number;
  gstPaise: number;
  adSpendPaise: number;
  taxCollectedAtSourcePaise: number;
  taxDeductedAtSourcePaise: number;
  otherAdjustmentsPaise: number;
  sellerDiscountPaise: number;
  totalDeductionsPaise: number;
}

export interface DiscrepancySignal {
  type: DiscrepancyType;
  amountPaise: number;
  message: string;
  confidence: number;
}

export interface CalculatedOrderProfit {
  orderId: string;
  platform: MarketplacePlatform;
  businessVertical: BusinessVertical;
  status: StandardizedOrderStatus;
  orderDateIso: string;
  grossSalesPaise: number;
  recognizedRevenuePaise: number;
  expectedNetPayoutPaise: number;
  trueProfitPaise: number;
  deductions: OrderDeductionBreakdown;
  discrepancySignals: DiscrepancySignal[];
}

export interface CashflowSummary {
  orderCount: number;
  profitableOrderCount: number;
  grossSalesPaise: number;
  recognizedRevenuePaise: number;
  totalDeductionsPaise: number;
  trueProfitPaise: number;
  claimsRecoverablePaise: number;
  atRiskPaise: number;
}

export interface ProfitPreviewResponse {
  generatedAtIso: string;
  currency: 'INR';
  summary: CashflowSummary;
  orders: CalculatedOrderProfit[];
}

export type ReviewIssueCode =
  | 'UNMAPPED_HEADER'
  | 'MISSING_REQUIRED_VALUE'
  | 'INVALID_NUMBER'
  | 'LOW_CONFIDENCE_FIELD';

export interface FlaggedCell {
  standardField: CsvFieldKey;
  issue: ReviewIssueCode;
  sourceHeader?: string;
  rawValue?: string;
  suggestedValue?: string;
}

export interface FlaggedRow {
  clientRowId: string;
  rowNumber: number;
  platform: MarketplacePlatform;
  rawRow: Record<string, string>;
  editableCells: FlaggedCell[];
}

export interface IngestionDraft {
  draftId: string;
  platform: MarketplacePlatform;
  status: 'READY_TO_COMMIT' | 'REQUIRES_REVIEW';
  totalRows: number;
  flaggedRows: FlaggedRow[];
  normalizedOrders: StandardizedOrderInput[];
  preview: ProfitPreviewResponse;
}

export interface ReviewedRowPatch {
  clientRowId: string;
  values: Partial<Record<CsvFieldKey, string>>;
}

export interface CommitReviewInput {
  draftId: string;
  corrections: ReviewedRowPatch[];
}

export interface CommitReviewResponse {
  status: 'COMMITTED';
  committedOrderCount: number;
  preview: ProfitPreviewResponse;
}
