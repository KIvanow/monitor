import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ClusterDiscoveryService } from './cluster-discovery.service';
import { ClusterMetricsService } from './cluster-metrics.service';

@Module({
  imports: [DatabaseModule],
  providers: [ClusterDiscoveryService, ClusterMetricsService],
  exports: [ClusterDiscoveryService, ClusterMetricsService],
})
export class ClusterModule {}
