import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { DatabaseModule } from '../database/database.module';
import { ClusterModule } from '../cluster/cluster.module';

@Module({
  imports: [DatabaseModule, ClusterModule],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
