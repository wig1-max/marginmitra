import { Injectable } from '@nestjs/common';

import {
  previewTrueProfit,
  ProfitPreviewResponse,
  StandardizedOrderInput
} from '@marginmitra/shared';

@Injectable()
export class ReconciliationService {
  preview(orders: StandardizedOrderInput[]): ProfitPreviewResponse {
    return previewTrueProfit(orders);
  }
}

