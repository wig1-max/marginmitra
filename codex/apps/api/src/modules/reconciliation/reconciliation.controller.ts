import { Body, Controller, Post } from '@nestjs/common';

import { ProfitPreviewResponse } from '@marginmitra/shared';

import { PreviewProfitDto } from './dto/preview-profit.dto';
import { ReconciliationService } from './reconciliation.service';

@Controller('v1/reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('preview')
  preview(@Body() dto: PreviewProfitDto): ProfitPreviewResponse {
    return this.reconciliationService.preview(dto.orders);
  }
}

