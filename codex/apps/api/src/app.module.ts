import { Module } from '@nestjs/common';

import { AuthModule } from './modules/auth/auth.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';

@Module({
  imports: [AuthModule, IngestionModule, ReconciliationModule]
})
export class AppModule {}
