import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabasePort } from '../common/interfaces/database-port.interface';
import {
  StoragePort,
  StoredClientSnapshot,
  ClientSnapshotQueryOptions,
  ClientTimeSeriesPoint,
  ClientAnalyticsStats,
} from '../common/interfaces/storage-port.interface';

@Injectable()
export class ClientAnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClientAnalyticsService.name);
  private pollInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(
    @Inject('DATABASE_CLIENT') private dbClient: DatabasePort,
    @Inject('STORAGE_CLIENT') private storage: StoragePort,
    private configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const config = this.configService.get('storage.clientAnalytics');
    if (config?.enabled) {
      this.logger.log(`Starting client analytics polling (interval: ${config.pollIntervalMs}ms, retention: ${config.retentionDays} days)`);
      await this.startPolling(config.pollIntervalMs);

      await this.cleanup();
      this.cleanupInterval = setInterval(
        () => this.cleanup().catch((err) => this.logger.error('Client analytics cleanup failed:', err)),
        24 * 60 * 60 * 1000,
      );
    }
  }

  onModuleDestroy(): void {
    this.stopPolling();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private async startPolling(intervalMs: number): Promise<void> {
    await this.captureSnapshot();

    this.pollInterval = setInterval(() => {
      if (!this.isPolling) {
        this.captureSnapshot().catch((err) =>
          this.logger.error('Client snapshot capture failed:', err),
        );
      }
    }, intervalMs);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async captureSnapshot(): Promise<void> {
    this.isPolling = true;
    try {
      const clients = await this.dbClient.getClients();
      const now = Date.now();
      const dbConfig = this.configService.get('database');

      const snapshots: StoredClientSnapshot[] = clients.map((c) => ({
        id: 0,
        clientId: c.id,
        addr: c.addr,
        name: c.name || '',
        user: c.user || 'default',
        db: c.db,
        cmd: c.cmd || '',
        age: c.age,
        idle: c.idle,
        flags: c.flags || '',
        sub: c.sub,
        psub: c.psub,
        qbuf: c.qbuf,
        qbufFree: c.qbufFree,
        obl: c.obl,
        oll: c.oll,
        omem: c.omem,
        capturedAt: now,
        sourceHost: dbConfig.host,
        sourcePort: dbConfig.port,
      }));

      const saved = await this.storage.saveClientSnapshot(snapshots);
      this.logger.debug(`Saved ${saved} client snapshots`);
    } finally {
      this.isPolling = false;
    }
  }

  async getSnapshots(options?: ClientSnapshotQueryOptions): Promise<StoredClientSnapshot[]> {
    return this.storage.getClientSnapshots(options);
  }

  async getTimeSeries(startTime: number, endTime: number, bucketSizeMs?: number): Promise<ClientTimeSeriesPoint[]> {
    return this.storage.getClientTimeSeries(startTime, endTime, bucketSizeMs);
  }

  async getStats(startTime?: number, endTime?: number): Promise<ClientAnalyticsStats> {
    return this.storage.getClientAnalyticsStats(startTime, endTime);
  }

  async getConnectionHistory(
    identifier: { name?: string; user?: string; addr?: string },
    startTime?: number,
    endTime?: number,
  ): Promise<StoredClientSnapshot[]> {
    return this.storage.getClientConnectionHistory(identifier, startTime, endTime);
  }

  async cleanup(): Promise<number> {
    const config = this.configService.get('storage.clientAnalytics');
    const cutoff = Date.now() - config.retentionDays * 24 * 60 * 60 * 1000;
    const pruned = await this.storage.pruneOldClientSnapshots(cutoff);
    this.logger.log(`Pruned ${pruned} old client snapshots`);
    return pruned;
  }
}
