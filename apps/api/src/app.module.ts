import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { AuditModule } from './audit/audit.module';
import { ClientAnalyticsModule } from './client-analytics/client-analytics.module';
import { PrometheusModule } from './prometheus/prometheus.module';
import { SettingsModule } from './settings/settings.module';

let AiModule: any = null;
let LicenseModule: any = null;
let KeyAnalyticsModule: any = null;
let AnomalyModule: any = null;

try {
  const module = require('@proprietary/ai/ai.module');
  AiModule = module.AiModule;
  console.log('[AI] Proprietary module loaded');
} catch {
  // Proprietary module not available
}

try {
  const licenseModule = require('@proprietary/license/license.module');
  LicenseModule = licenseModule.LicenseModule;
  console.log('[License] Proprietary module loaded');
} catch {
  // Proprietary module not available
}

try {
  const keyAnalyticsModule = require('@proprietary/key-analytics/key-analytics.module');
  KeyAnalyticsModule = keyAnalyticsModule.KeyAnalyticsModule;
  console.log('[KeyAnalytics] Proprietary module loaded');
} catch {
  // Proprietary module not available
}

try {
  const anomalyModule = require('@proprietary/anomaly-detection/anomaly.module');
  AnomalyModule = anomalyModule.AnomalyModule;
  console.log('[AnomalyDetection] Proprietary module loaded');
} catch {
  // Proprietary module not available
}

const baseImports = [
  ConfigModule,
  DatabaseModule,
  HealthModule,
  MetricsModule,
  AuditModule,
  ClientAnalyticsModule,
  PrometheusModule,
  SettingsModule,
];

const proprietaryImports = [
  LicenseModule,
  KeyAnalyticsModule,
  AnomalyModule,
  AiModule,
].filter(Boolean);

@Module({
  imports: [...baseImports, ...proprietaryImports],
})
export class AppModule {}
