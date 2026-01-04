import { Module } from '@nestjs/common';
import { ClientAnalyticsController } from './client-analytics.controller';
import { ClientAnalyticsService } from './client-analytics.service';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [ClientAnalyticsController],
  providers: [ClientAnalyticsService],
})
export class ClientAnalyticsModule {}
