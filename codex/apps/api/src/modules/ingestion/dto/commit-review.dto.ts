import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

import { csvFieldKeys } from '@marginmitra/shared';

class ReviewedRowPatchDto {
  @IsString()
  clientRowId!: string;

  @IsObject()
  values!: Partial<Record<(typeof csvFieldKeys)[number], string>>;
}

export class CommitReviewDto {
  @IsString()
  draftId!: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ReviewedRowPatchDto)
  corrections!: ReviewedRowPatchDto[];
}

export class DraftLookupParamsDto {
  @IsString()
  draftId!: string;
}

