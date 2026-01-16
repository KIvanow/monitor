import { Module } from '@nestjs/common';
import { AnomalyService } from './anomaly.service';
import { AnomalyController } from './anomaly.controller';
import { DatabaseModule } from '@app/database/database.module';
import { StorageModule } from '@app/storage/storage.module';
import { PrometheusModule } from '@app/prometheus/prometheus.module';

@Module({
  imports: [DatabaseModule, StorageModule, PrometheusModule],
  controllers: [AnomalyController],
  providers: [AnomalyService],
  exports: [AnomalyService],
})
export class AnomalyModule {}
