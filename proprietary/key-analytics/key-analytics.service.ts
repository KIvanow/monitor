import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { DatabasePort } from '@app/common/interfaces/database-port.interface';
import { StoragePort, KeyPatternSnapshot } from '@app/common/interfaces/storage-port.interface';
import { LicenseService } from '@proprietary/license/license.service';
import { randomUUID } from 'crypto';

@Injectable()
export class KeyAnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeyAnalyticsService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private readonly sampleSize: number;
  private readonly scanBatchSize: number;
  private readonly intervalMs: number;

  constructor(
    @Inject('DATABASE_CLIENT') private readonly dbClient: DatabasePort,
    @Inject('STORAGE_CLIENT') private readonly storage: StoragePort,
    private readonly license: LicenseService,
  ) {
    this.sampleSize = parseInt(process.env.KEY_ANALYTICS_SAMPLE_SIZE || '10000', 10);
    this.scanBatchSize = parseInt(process.env.KEY_ANALYTICS_SCAN_BATCH_SIZE || '1000', 10);
    this.intervalMs = parseInt(process.env.KEY_ANALYTICS_INTERVAL_MS || '300000', 10);
  }

  async onModuleInit() {
    if (!this.license.hasFeature('keyAnalytics')) {
      this.logger.log('Key Analytics requires Pro license - service disabled');
      return;
    }

    this.logger.log(
      `Key Analytics service initialized (sample: ${this.sampleSize}, interval: ${this.intervalMs}ms)`,
    );

    this.startPeriodicCollection();
  }

  async onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private startPeriodicCollection() {
    this.collectKeyAnalytics().catch((err) => {
      this.logger.error('Failed initial key analytics collection:', err);
    });

    this.intervalId = setInterval(() => {
      this.collectKeyAnalytics().catch((err) => {
        this.logger.error('Failed key analytics collection:', err);
      });
    }, this.intervalMs);
  }

  async collectKeyAnalytics() {
    if (this.isRunning) {
      this.logger.warn('Key analytics collection already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const client = this.dbClient.getClient();
      const dbSize = await client.dbsize();

      if (dbSize === 0) {
        this.logger.log('No keys found in database, skipping analytics');
        return;
      }

      const patterns = new Map<
        string,
        {
          count: number;
          totalMemory: number;
          maxMemory: number;
          totalIdleTime: number;
          withTtl: number;
          withoutTtl: number;
          ttlValues: number[];
          accessFrequencies: number[];
        }
      >();

      let cursor = '0';
      let scanned = 0;

      do {
        const [newCursor, keys] = await client.scan(cursor, 'COUNT', this.scanBatchSize);
        cursor = newCursor;

        for (const key of keys) {
          if (scanned >= this.sampleSize) break;
          scanned++;

          const pattern = this.extractPattern(key);
          const stats = patterns.get(pattern) || {
            count: 0,
            totalMemory: 0,
            maxMemory: 0,
            totalIdleTime: 0,
            withTtl: 0,
            withoutTtl: 0,
            ttlValues: [],
            accessFrequencies: [],
          };

          try {
            const pipeline = client.pipeline();
            pipeline.memory('USAGE', key);
            pipeline.object('IDLETIME', key);
            pipeline.object('FREQ', key);
            pipeline.ttl(key);

            const results = (await pipeline.exec()) || [];
            const [memResult, idleResult, freqResult, ttlResult] = results;

            stats.count++;

            if (memResult && memResult[1] !== null) {
              const mem = memResult[1] as number;
              stats.totalMemory += mem;
              if (mem > stats.maxMemory) stats.maxMemory = mem;
            }

            if (idleResult && idleResult[1] !== null) {
              stats.totalIdleTime += idleResult[1] as number;
            }

            if (freqResult && freqResult[1] !== null) {
              stats.accessFrequencies.push(freqResult[1] as number);
            }

            const ttl = ttlResult?.[1] as number;
            if (ttl > 0) {
              stats.withTtl++;
              stats.ttlValues.push(ttl);
            } else {
              stats.withoutTtl++;
            }

            patterns.set(pattern, stats);
          } catch (err) {
            this.logger.debug(`Failed to inspect key ${key}: ${err}`);
          }
        }

        if (scanned >= this.sampleSize) break;
      } while (cursor !== '0');

      const samplingRatio = scanned / dbSize;
      const snapshots: KeyPatternSnapshot[] = [];

      for (const [pattern, stats] of patterns.entries()) {
        const avgMemory = stats.count > 0 ? Math.round(stats.totalMemory / stats.count) : 0;
        const avgIdleTime = stats.count > 0 ? Math.round(stats.totalIdleTime / stats.count) : 0;
        const avgFreq =
          stats.accessFrequencies.length > 0
            ? stats.accessFrequencies.reduce((a, b) => a + b, 0) / stats.accessFrequencies.length
            : undefined;

        const avgTtl =
          stats.ttlValues.length > 0
            ? Math.round(stats.ttlValues.reduce((a, b) => a + b, 0) / stats.ttlValues.length)
            : undefined;
        const minTtl = stats.ttlValues.length > 0 ? Math.min(...stats.ttlValues) : undefined;
        const maxTtl = stats.ttlValues.length > 0 ? Math.max(...stats.ttlValues) : undefined;

        const staleCount = avgIdleTime > 86400 ? Math.round((avgIdleTime / 86400) * stats.count) : 0;
        const expiringSoon = stats.ttlValues.filter((t) => t < 3600).length;
        const expiringSoonCount = Math.round((expiringSoon / (stats.ttlValues.length || 1)) * stats.withTtl);

        let hotCount: number | undefined;
        let coldCount: number | undefined;
        if (avgFreq !== undefined) {
          const coldThreshold = avgFreq / 2;
          hotCount = Math.round(
            (stats.accessFrequencies.filter((f) => f > avgFreq).length / stats.count) * stats.count,
          );
          coldCount = Math.round(
            (stats.accessFrequencies.filter((f) => f < coldThreshold).length / stats.count) * stats.count,
          );
        }

        snapshots.push({
          id: randomUUID(),
          timestamp: Date.now(),
          pattern,
          keyCount: Math.round(stats.count / samplingRatio),
          sampledKeyCount: stats.count,
          keysWithTtl: Math.round(stats.withTtl / samplingRatio),
          keysExpiringSoon: Math.round(expiringSoonCount / samplingRatio),
          totalMemoryBytes: Math.round(stats.totalMemory / samplingRatio),
          avgMemoryBytes: avgMemory,
          maxMemoryBytes: stats.maxMemory,
          avgAccessFrequency: avgFreq,
          hotKeyCount: hotCount,
          coldKeyCount: coldCount,
          avgIdleTimeSeconds: avgIdleTime,
          staleKeyCount: staleCount,
          avgTtlSeconds: avgTtl,
          minTtlSeconds: minTtl,
          maxTtlSeconds: maxTtl,
        });
      }

      await this.storage.saveKeyPatternSnapshots(snapshots);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Key Analytics: sampled ${scanned}/${dbSize} keys (${(samplingRatio * 100).toFixed(1)}%), ` +
        `found ${patterns.size} patterns in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('Error collecting key analytics:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private extractPattern(key: string): string {
    const parts = key.split(/[:._-]/);
    const patternParts = parts.map((part) => {
      if (/^\d+$/.test(part)) return '*';
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) return '*';
      if (/^[0-9a-f]{24}$/i.test(part)) return '*';
      if (/^[0-9a-f]{32,}$/i.test(part)) return '*';
      return part;
    });
    return patternParts.join(':');
  }

  async getSummary(startTime?: number, endTime?: number) {
    return this.storage.getKeyAnalyticsSummary(startTime, endTime);
  }

  async getPatternSnapshots(options?: {
    pattern?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }) {
    return this.storage.getKeyPatternSnapshots(options);
  }

  async getPatternTrends(pattern: string, startTime: number, endTime: number) {
    return this.storage.getKeyPatternTrends(pattern, startTime, endTime);
  }

  async pruneOldSnapshots(cutoffTimestamp: number): Promise<number> {
    return this.storage.pruneOldKeyPatternSnapshots(cutoffTimestamp);
  }
}
