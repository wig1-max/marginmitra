import { IsIn, IsOptional, IsString } from 'class-validator';

import { marketplacePlatforms } from '@marginmitra/shared';

export class UploadIngestionDto {
  @IsIn([...marketplacePlatforms])
  platform!: (typeof marketplacePlatforms)[number];

  @IsOptional()
  @IsString()
  sourceLabel?: string;
}

