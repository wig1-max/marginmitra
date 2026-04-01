import { IsObject, IsOptional, IsString } from 'class-validator';

export class ExchangeTokenDto {
  @IsString()
  firebaseIdToken!: string;

  @IsOptional()
  @IsObject()
  consentArtifact?: Record<string, unknown>;
}

