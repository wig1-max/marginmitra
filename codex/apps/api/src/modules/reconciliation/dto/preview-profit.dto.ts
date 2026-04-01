import {
  ArrayMinSize,
  IsIn,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  businessVerticals,
  marketplacePlatforms,
  orderStatuses,
  shippingZones,
  StandardizedOrderInput
} from '@marginmitra/shared';

class StandardizedOrderInputDto implements StandardizedOrderInput {
  @IsString()
  orderId!: string;

  @IsIn([...marketplacePlatforms])
  platform!: StandardizedOrderInput['platform'];

  @IsIn([...businessVerticals])
  businessVertical!: StandardizedOrderInput['businessVertical'];

  @IsISO8601()
  orderDateIso!: string;

  @IsOptional()
  @IsISO8601()
  settlementDateIso?: string;

  @IsIn([...orderStatuses])
  status!: StandardizedOrderInput['status'];

  @IsIn(['INR'])
  currency: 'INR' = 'INR';

  @IsInt()
  @Min(0)
  grossSalesPaise!: number;

  @IsInt()
  @Min(0)
  sellerDiscountPaise!: number;

  @IsInt()
  @Min(0)
  adSpendPaise!: number;

  @IsInt()
  @Min(0)
  paymentGatewayFeePaise!: number;

  @IsInt()
  @Min(0)
  fixedPlatformFeePaise!: number;

  @IsInt()
  @Min(0)
  @Max(10000)
  commissionRateBps!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  commissionPaise?: number;

  @IsInt()
  @Min(0)
  @Max(10000)
  expectedRtoRateBps!: number;

  @IsInt()
  @Min(1)
  packageWeightGrams!: number;

  @IsIn([...shippingZones])
  shippingZone!: StandardizedOrderInput['shippingZone'];

  @IsOptional()
  @IsInt()
  @Min(0)
  forwardShippingFeePaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reverseShippingFeePaise?: number;

  @IsInt()
  @Min(0)
  @Max(10000)
  gstRateBps!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gstOnServicesPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationPenaltyPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  taxCollectedAtSourcePaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  taxDeductedAtSourcePaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  otherAdjustmentsPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  actualPayoutPaise?: number;
}

export class PreviewProfitDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StandardizedOrderInputDto)
  orders!: StandardizedOrderInputDto[];
}

