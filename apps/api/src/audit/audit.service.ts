import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabasePort } from '../common/interfaces/database-port.interface';
import { StoragePort, StoredAclEntry } from '../common/interfaces/storage-port.interface';
import { AclLogEntry } from '../common/types/metrics.types';
import { PrometheusService } from '../prometheus/prometheus.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  private pollInterval: NodeJS.Timeout | null = null;
  private lastSeenTimestamp: number = 0;
  private readonly sourceHost: string;
  private readonly sourcePort: number;

  constructor(
    @Inject('DATABASE_CLIENT')
    private readonly dbClient: DatabasePort,
    @Inject('STORAGE_CLIENT')
    private readonly storageClient: StoragePort,
    private readonly configService: ConfigService,
    private readonly prometheusService: PrometheusService,
    private readonly settingsService: SettingsService,
  ) {
    this.sourceHost = this.configService.get<string>('database.host', 'localhost');
    this.sourcePort = this.configService.get<number>('database.port', 6379);
  }

  private get pollIntervalMs(): number {
    return this.settingsService.getCachedSettings().auditPollIntervalMs;
  }

  async onModuleInit(): Promise<void> {
    if (!this.storageClient.isReady()) {
      this.logger.error('Storage client is not ready');
      return;
    }

    this.logger.log(`Starting audit trail polling (interval: ${this.pollIntervalMs}ms)`);

    await this.pollAclLog();
    this.startPolling();
  }

  private startPolling(): void {
    const scheduleNextPoll = () => {
      this.pollInterval = setTimeout(async () => {
        try {
          await this.pollAclLog();
        } catch (error) {
          this.logger.error(`Failed to poll ACL log: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        scheduleNextPoll();
      }, this.pollIntervalMs);
    };
    scheduleNextPoll();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollAclLog(): Promise<void> {
    const endTimer = this.prometheusService.startPollTimer('audit');

    try {
      const capabilities = this.dbClient.getCapabilities();
      if (!capabilities.hasAclLog) {
        this.logger.warn('ACL LOG not supported by database, skipping poll');
        return;
      }

      // Get ACL log entries
      const aclEntries = await this.dbClient.getAclLog(100);

      if (aclEntries.length === 0) {
        return;
      }

      // Filter out entries we've already seen
      const newEntries = this.deduplicateEntries(aclEntries);

      if (newEntries.length === 0) {
        return;
      }

      // Enrich entries with metadata
      const capturedAt = Math.floor(Date.now() / 1000);
      const storedEntries: StoredAclEntry[] = newEntries.map((entry) => ({
        id: 0, // Will be assigned by database
        count: entry.count,
        reason: entry.reason,
        context: entry.context,
        object: entry.object,
        username: entry.username,
        ageSeconds: entry.ageSeconds,
        clientInfo: entry.clientInfo,
        timestampCreated: entry.timestampCreated,
        timestampLastUpdated: entry.timestampLastUpdated,
        capturedAt,
        sourceHost: this.sourceHost,
        sourcePort: this.sourcePort,
      }));

      // Save to storage
      const saved = await this.storageClient.saveAclEntries(storedEntries);
      this.logger.debug(`Saved ${saved} new ACL entries`);

      const latestTimestamp = Math.max(...newEntries.map((e) => e.timestampLastUpdated));
      this.lastSeenTimestamp = latestTimestamp;
      this.prometheusService.incrementPollCounter();
    } catch (error) {
      this.logger.error(`Error polling ACL log: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      endTimer();
    }
  }

  private deduplicateEntries(entries: AclLogEntry[]): AclLogEntry[] {
    // Filter entries that are newer than the last seen timestamp
    return entries.filter((entry) => entry.timestampLastUpdated > this.lastSeenTimestamp);
  }
}
