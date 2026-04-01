import * as DocumentPicker from 'expo-document-picker';
import {
  CommitReviewResponse,
  IngestionDraft,
  ProfitPreviewResponse,
  StandardizedOrderInput
} from '@marginmitra/shared';

import { apiClient } from './http';

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  phoneNumber?: string;
  roles: string[];
  isReviewerBypass: boolean;
}

export interface AuthSessionResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

export const demoOrders: StandardizedOrderInput[] = [
  {
    orderId: 'SWG-12091',
    platform: 'SWIGGY',
    businessVertical: 'FOOD_DELIVERY',
    orderDateIso: '2026-04-01T07:30:00.000Z',
    settlementDateIso: '2026-04-01T16:30:00.000Z',
    status: 'DELIVERED',
    currency: 'INR',
    grossSalesPaise: 189900,
    sellerDiscountPaise: 10000,
    adSpendPaise: 9000,
    paymentGatewayFeePaise: 3200,
    fixedPlatformFeePaise: 1200,
    commissionRateBps: 2400,
    commissionPaise: 43176,
    expectedRtoRateBps: 0,
    packageWeightGrams: 500,
    shippingZone: 'LOCAL',
    gstRateBps: 1800,
    gstOnServicesPaise: 8564,
    cancellationPenaltyPaise: 0,
    taxCollectedAtSourcePaise: 1899,
    taxDeductedAtSourcePaise: 1899,
    otherAdjustmentsPaise: 0,
    actualPayoutPaise: 120962
  },
  {
    orderId: 'ZMT-88310',
    platform: 'ZOMATO',
    businessVertical: 'FOOD_DELIVERY',
    orderDateIso: '2026-04-01T09:45:00.000Z',
    settlementDateIso: '2026-04-01T17:45:00.000Z',
    status: 'DELIVERED',
    currency: 'INR',
    grossSalesPaise: 249900,
    sellerDiscountPaise: 20000,
    adSpendPaise: 15000,
    paymentGatewayFeePaise: 3800,
    fixedPlatformFeePaise: 0,
    commissionRateBps: 2650,
    commissionPaise: 60974,
    expectedRtoRateBps: 0,
    packageWeightGrams: 500,
    shippingZone: 'LOCAL',
    gstRateBps: 1800,
    gstOnServicesPaise: 11659,
    cancellationPenaltyPaise: 0,
    taxCollectedAtSourcePaise: 2499,
    taxDeductedAtSourcePaise: 2499,
    otherAdjustmentsPaise: 1200,
    actualPayoutPaise: 132269
  },
  {
    orderId: 'AMZ-40391',
    platform: 'AMAZON',
    businessVertical: 'ECOMMERCE',
    orderDateIso: '2026-04-01T10:30:00.000Z',
    status: 'DELIVERED',
    currency: 'INR',
    grossSalesPaise: 289900,
    sellerDiscountPaise: 15000,
    adSpendPaise: 20000,
    paymentGatewayFeePaise: 0,
    fixedPlatformFeePaise: 1500,
    commissionRateBps: 1450,
    expectedRtoRateBps: 350,
    packageWeightGrams: 1200,
    shippingZone: 'REGIONAL',
    forwardShippingFeePaise: 8600,
    gstRateBps: 1800,
    actualPayoutPaise: 201500
  }
];

export async function exchangeFirebaseToken(firebaseIdToken: string) {
  const response = await apiClient.post<AuthSessionResponse>('/auth/exchange', {
    firebaseIdToken
  });
  return response.data;
}

export async function reviewerLogin(phoneNumber: string, otp: string) {
  const response = await apiClient.post<AuthSessionResponse>('/auth/reviewer-login', {
    phoneNumber,
    otp
  });
  return response.data;
}

export async function fetchCurrentUser() {
  const response = await apiClient.get<{ user: AuthenticatedUser }>('/auth/me');
  return response.data.user;
}

export async function fetchTrueProfitPreview(
  orders: StandardizedOrderInput[] = demoOrders
): Promise<ProfitPreviewResponse> {
  const response = await apiClient.post<ProfitPreviewResponse>(
    '/v1/reconciliation/preview',
    {
      orders
    }
  );

  return response.data;
}

export async function uploadSettlementCsv(
  platform: StandardizedOrderInput['platform'],
  asset: DocumentPicker.DocumentPickerAsset
) {
  const formData = new FormData();
  formData.append('platform', platform);
  formData.append(
    'file',
    {
      uri: asset.uri,
      name: asset.name ?? 'settlement.csv',
      type: asset.mimeType ?? 'text/csv'
    } as never
  );

  const response = await apiClient.post<IngestionDraft>('/ingestion/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    validateStatus: (status) => status === 200 || status === 206
  });

  return response.data;
}

export async function fetchDraft(draftId: string) {
  const response = await apiClient.get<IngestionDraft>(`/ingestion/review/${draftId}`);
  return response.data;
}

export async function commitReviewedDraft(
  draftId: string,
  corrections: Array<{
    clientRowId: string;
    values: Record<string, string>;
  }>
) {
  const response = await apiClient.post<CommitReviewResponse>('/ingestion/commit', {
    draftId,
    corrections
  });

  return response.data;
}
