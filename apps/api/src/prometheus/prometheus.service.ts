import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { Registry, Gauge, collectDefaultMetrics } from 'prom-client';
import { StoragePort } from '../common/interfaces/storage-port.interface';
import { DatabasePort } from '../common/interfaces/database-port.interface';
import { analyzeSlowLogPatterns } from '../metrics/slowlog-analyzer';

@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly logger = new Logger(PrometheusService.name);
  private registry: Registry;

  // ACL Audit Metrics
  private aclDeniedTotal: Gauge;
  private aclDeniedByReason: Gauge;
  private aclDeniedByUser: Gauge;

  // Client Analytics Metrics
  private clientConnectionsCurrent: Gauge;
  private clientConnectionsByName: Gauge;
  private clientConnectionsByUser: Gauge;
  private clientConnectionsPeak: Gauge;

  // Slowlog Pattern Metrics
  private slowlogPatternCount: Gauge;
  private slowlogPatternDuration: Gauge;
  private slowlogPatternPercentage: Gauge;

  // COMMANDLOG Metrics (Valkey-specific)
  private commandlogLargeRequestCount: Gauge;
  private commandlogLargeReplyCount: Gauge;
  private commandlogLargeRequestByPattern: Gauge;
  private commandlogLargeReplyByPattern: Gauge;

  // Standard INFO Metrics - Server
  private uptimeInSeconds: Gauge;
  private instanceInfo: Gauge;

  // Standard INFO Metrics - Clients
  private connectedClients: Gauge;
  private blockedClients: Gauge;
  private trackingClients: Gauge;

  // Standard INFO Metrics - Memory
  private memoryUsedBytes: Gauge;
  private memoryUsedRssBytes: Gauge;
  private memoryUsedPeakBytes: Gauge;
  private memoryMaxBytes: Gauge;
  private memoryFragmentationRatio: Gauge;
  private memoryFragmentationBytes: Gauge;

  // Standard INFO Metrics - Stats
  private connectionsReceivedTotal: Gauge;
  private commandsProcessedTotal: Gauge;
  private instantaneousOpsPerSec: Gauge;
  private instantaneousInputKbps: Gauge;
  private instantaneousOutputKbps: Gauge;
  private keyspaceHitsTotal: Gauge;
  private keyspaceMissesTotal: Gauge;
  private evictedKeysTotal: Gauge;
  private expiredKeysTotal: Gauge;
  private pubsubChannels: Gauge;
  private pubsubPatterns: Gauge;

  // Standard INFO Metrics - Replication
  private connectedSlaves: Gauge;
  private replicationOffset: Gauge;
  private masterLinkUp: Gauge;
  private masterLastIoSecondsAgo: Gauge;

  // Keyspace Metrics (per db)
  private dbKeys: Gauge;
  private dbKeysExpiring: Gauge;
  private dbAvgTtlSeconds: Gauge;

  // Cluster Metrics
  private clusterEnabled: Gauge;
  private clusterKnownNodes: Gauge;
  private clusterSize: Gauge;
  private clusterSlotsAssigned: Gauge;
  private clusterSlotsOk: Gauge;
  private clusterSlotsFail: Gauge;
  private clusterSlotsPfail: Gauge;

  // Cluster Slot Metrics (Valkey 8.0+ specific)
  private clusterSlotKeys: Gauge;
  private clusterSlotExpires: Gauge;
  private clusterSlotReadsTotal: Gauge;
  private clusterSlotWritesTotal: Gauge;

  // Slowlog Raw Metrics
  private slowlogLength: Gauge;
  private slowlogLastId: Gauge;

  constructor(
    @Inject('STORAGE_CLIENT') private storage: StoragePort,
    @Inject('DATABASE_CLIENT') private dbClient: DatabasePort,
  ) {
    this.registry = new Registry();
    this.initializeMetrics();
  }

  async onModuleInit(): Promise<void> {
    collectDefaultMetrics({ register: this.registry, prefix: 'betterdb_' });
    this.logger.log('Prometheus metrics initialized');
  }

  private createGauge(name: string, help: string, labelNames?: string[]): Gauge {
    return new Gauge({
      name: `betterdb_${name}`,
      help,
      ...(labelNames && { labelNames }),
      registers: [this.registry],
    });
  }

  private initializeMetrics(): void {
    // ACL Audit
    this.aclDeniedTotal = this.createGauge('acl_denied', 'Total ACL denied events captured');
    this.aclDeniedByReason = this.createGauge('acl_denied_by_reason', 'ACL denied events by reason', ['reason']);
    this.aclDeniedByUser = this.createGauge('acl_denied_by_user', 'ACL denied events by username', ['username']);

    // Client Analytics
    this.clientConnectionsCurrent = this.createGauge('client_connections_current', 'Current number of client connections');
    this.clientConnectionsByName = this.createGauge('client_connections_by_name', 'Current connections by client name', ['client_name']);
    this.clientConnectionsByUser = this.createGauge('client_connections_by_user', 'Current connections by ACL user', ['user']);
    this.clientConnectionsPeak = this.createGauge('client_connections_peak', 'Peak connections in retention period');

    // Slowlog Patterns
    this.slowlogPatternCount = this.createGauge('slowlog_pattern_count', 'Number of slow queries per pattern', ['pattern']);
    this.slowlogPatternDuration = this.createGauge('slowlog_pattern_avg_duration_us', 'Average duration in microseconds per pattern', ['pattern']);
    this.slowlogPatternPercentage = this.createGauge('slowlog_pattern_percentage', 'Percentage of slow queries per pattern', ['pattern']);

    // COMMANDLOG (Valkey 8.1+)
    this.commandlogLargeRequestCount = this.createGauge('commandlog_large_request', 'Total large request entries');
    this.commandlogLargeReplyCount = this.createGauge('commandlog_large_reply', 'Total large reply entries');
    this.commandlogLargeRequestByPattern = this.createGauge('commandlog_large_request_by_pattern', 'Large request count by command pattern', ['pattern']);
    this.commandlogLargeReplyByPattern = this.createGauge('commandlog_large_reply_by_pattern', 'Large reply count by command pattern', ['pattern']);

    // Standard INFO - Server
    this.uptimeInSeconds = this.createGauge('uptime_in_seconds', 'Server uptime in seconds');
    this.instanceInfo = this.createGauge('instance_info', 'Instance information (always 1)', ['version', 'role', 'os']);

    // Standard INFO - Clients
    this.connectedClients = this.createGauge('connected_clients', 'Number of client connections');
    this.blockedClients = this.createGauge('blocked_clients', 'Clients blocked on BLPOP, BRPOP, etc');
    this.trackingClients = this.createGauge('tracking_clients', 'Clients being tracked for client-side caching');

    // Standard INFO - Memory
    this.memoryUsedBytes = this.createGauge('memory_used_bytes', 'Total allocated memory in bytes');
    this.memoryUsedRssBytes = this.createGauge('memory_used_rss_bytes', 'RSS memory usage in bytes');
    this.memoryUsedPeakBytes = this.createGauge('memory_used_peak_bytes', 'Peak memory usage in bytes');
    this.memoryMaxBytes = this.createGauge('memory_max_bytes', 'Maximum memory limit in bytes (0 if unlimited)');
    this.memoryFragmentationRatio = this.createGauge('memory_fragmentation_ratio', 'Memory fragmentation ratio');
    this.memoryFragmentationBytes = this.createGauge('memory_fragmentation_bytes', 'Memory fragmentation in bytes');

    // Standard INFO - Stats
    this.connectionsReceivedTotal = this.createGauge('connections_received_total', 'Total connections received');
    this.commandsProcessedTotal = this.createGauge('commands_processed_total', 'Total commands processed');
    this.instantaneousOpsPerSec = this.createGauge('instantaneous_ops_per_sec', 'Current operations per second');
    this.instantaneousInputKbps = this.createGauge('instantaneous_input_kbps', 'Current input kilobytes per second');
    this.instantaneousOutputKbps = this.createGauge('instantaneous_output_kbps', 'Current output kilobytes per second');
    this.keyspaceHitsTotal = this.createGauge('keyspace_hits_total', 'Total keyspace hits');
    this.keyspaceMissesTotal = this.createGauge('keyspace_misses_total', 'Total keyspace misses');
    this.evictedKeysTotal = this.createGauge('evicted_keys_total', 'Total evicted keys');
    this.expiredKeysTotal = this.createGauge('expired_keys_total', 'Total expired keys');
    this.pubsubChannels = this.createGauge('pubsub_channels', 'Number of pub/sub channels');
    this.pubsubPatterns = this.createGauge('pubsub_patterns', 'Number of pub/sub patterns');

    // Standard INFO - Replication
    this.connectedSlaves = this.createGauge('connected_slaves', 'Number of connected replicas');
    this.replicationOffset = this.createGauge('replication_offset', 'Replication offset');
    this.masterLinkUp = this.createGauge('master_link_up', '1 if link to master is up (replica only)');
    this.masterLastIoSecondsAgo = this.createGauge('master_last_io_seconds_ago', 'Seconds since last I/O with master (replica only)');

    // Keyspace Metrics (per database)
    this.dbKeys = this.createGauge('db_keys', 'Total keys in database', ['db']);
    this.dbKeysExpiring = this.createGauge('db_keys_expiring', 'Keys with expiration in database', ['db']);
    this.dbAvgTtlSeconds = this.createGauge('db_avg_ttl_seconds', 'Average TTL in seconds', ['db']);

    // Cluster Metrics
    this.clusterEnabled = this.createGauge('cluster_enabled', '1 if cluster mode is enabled');
    this.clusterKnownNodes = this.createGauge('cluster_known_nodes', 'Number of known cluster nodes');
    this.clusterSize = this.createGauge('cluster_size', 'Number of master nodes in cluster');
    this.clusterSlotsAssigned = this.createGauge('cluster_slots_assigned', 'Number of assigned slots');
    this.clusterSlotsOk = this.createGauge('cluster_slots_ok', 'Number of slots in OK state');
    this.clusterSlotsFail = this.createGauge('cluster_slots_fail', 'Number of slots in FAIL state');
    this.clusterSlotsPfail = this.createGauge('cluster_slots_pfail', 'Number of slots in PFAIL state');

    // Cluster Slot Metrics (Valkey 8.0+)
    this.clusterSlotKeys = this.createGauge('cluster_slot_keys', 'Keys in cluster slot', ['slot']);
    this.clusterSlotExpires = this.createGauge('cluster_slot_expires', 'Expiring keys in cluster slot', ['slot']);
    this.clusterSlotReadsTotal = this.createGauge('cluster_slot_reads_total', 'Total reads for cluster slot', ['slot']);
    this.clusterSlotWritesTotal = this.createGauge('cluster_slot_writes_total', 'Total writes for cluster slot', ['slot']);

    // Slowlog Raw Metrics
    this.slowlogLength = this.createGauge('slowlog_length', 'Current slowlog length');
    this.slowlogLastId = this.createGauge('slowlog_last_id', 'ID of last slowlog entry');
  }

  async updateMetrics(): Promise<void> {
    // Fetch INFO once and update all related metrics
    await this.updateAllInfoBasedMetrics();
    // Update slowlog raw metrics
    await this.updateSlowlogRawMetrics();

    // Update BetterDB-specific metrics
    await this.updateAclMetrics();
    await this.updateClientMetrics();
    await this.updateSlowlogMetrics();
    await this.updateCommandlogMetrics();
  }

  private async updateAllInfoBasedMetrics(): Promise<void> {
    try {
      const info = await this.dbClient.getInfoParsed();
      
      this.updateServerMetrics(info);
      this.updateClientInfoMetrics(info);
      this.updateMemoryMetrics(info);
      this.updateStatsMetrics(info);
      this.updateReplicationMetrics(info);
      this.updateKeyspaceMetricsFromInfo(info);
      await this.updateClusterMetricsFromInfo(info);
    } catch (error) {
      this.logger.error('Failed to update INFO-based metrics', error);
    }
  }

  private updateServerMetrics(info: Record<string, any>): void {
    if (!info.server) return;
    
    const version = info.server.valkey_version || info.server.redis_version || 'unknown';
    const role = info.replication?.role || 'unknown';
    const os = info.server.os || 'unknown';

    this.uptimeInSeconds.set(parseInt(info.server.uptime_in_seconds) || 0);
    this.instanceInfo.labels(version, role, os).set(1);
  }

  private updateClientInfoMetrics(info: Record<string, any>): void {
    if (!info.clients) return;
    
    this.connectedClients.set(parseInt(info.clients.connected_clients) || 0);
    this.blockedClients.set(parseInt(info.clients.blocked_clients) || 0);
    if (info.clients.tracking_clients) {
      this.trackingClients.set(parseInt(info.clients.tracking_clients) || 0);
    }
  }

  private updateMemoryMetrics(info: Record<string, any>): void {
    if (!info.memory) return;
    
    this.memoryUsedBytes.set(parseInt(info.memory.used_memory) || 0);
    this.memoryUsedRssBytes.set(parseInt(info.memory.used_memory_rss) || 0);
    this.memoryUsedPeakBytes.set(parseInt(info.memory.used_memory_peak) || 0);
    this.memoryMaxBytes.set(parseInt(info.memory.maxmemory) || 0);
    this.memoryFragmentationRatio.set(parseFloat(info.memory.mem_fragmentation_ratio) || 0);
    this.memoryFragmentationBytes.set(parseInt(info.memory.mem_fragmentation_bytes) || 0);
  }

  private updateStatsMetrics(info: Record<string, any>): void {
    if (!info.stats) return;
    
    this.connectionsReceivedTotal.set(parseInt(info.stats.total_connections_received) || 0);
    this.commandsProcessedTotal.set(parseInt(info.stats.total_commands_processed) || 0);
    this.instantaneousOpsPerSec.set(parseInt(info.stats.instantaneous_ops_per_sec) || 0);
    this.instantaneousInputKbps.set(parseFloat(info.stats.instantaneous_input_kbps) || 0);
    this.instantaneousOutputKbps.set(parseFloat(info.stats.instantaneous_output_kbps) || 0);
    this.keyspaceHitsTotal.set(parseInt(info.stats.keyspace_hits) || 0);
    this.keyspaceMissesTotal.set(parseInt(info.stats.keyspace_misses) || 0);
    this.evictedKeysTotal.set(parseInt(info.stats.evicted_keys) || 0);
    this.expiredKeysTotal.set(parseInt(info.stats.expired_keys) || 0);
    this.pubsubChannels.set(parseInt(info.stats.pubsub_channels) || 0);
    this.pubsubPatterns.set(parseInt(info.stats.pubsub_patterns) || 0);
  }

  private updateReplicationMetrics(info: Record<string, any>): void {
    if (!info.replication) return;
    
    const role = info.replication.role;

    if (role === 'master') {
      this.connectedSlaves.set(parseInt(info.replication.connected_slaves || '0') || 0);
      if (info.replication.master_repl_offset) {
        this.replicationOffset.set(parseInt(info.replication.master_repl_offset) || 0);
      }
    } else if (role === 'slave') {
      const masterLinkStatus = info.replication.master_link_status;
      this.masterLinkUp.set(masterLinkStatus === 'up' ? 1 : 0);

      if (info.replication.master_last_io_seconds_ago) {
        this.masterLastIoSecondsAgo.set(parseInt(info.replication.master_last_io_seconds_ago) || 0);
      }

      if (info.replication.slave_repl_offset) {
        this.replicationOffset.set(parseInt(info.replication.slave_repl_offset) || 0);
      }
    }
  }

  private updateKeyspaceMetricsFromInfo(info: Record<string, any>): void {
    if (!info.keyspace) return;
    
    this.dbKeys.reset();
    this.dbKeysExpiring.reset();
    this.dbAvgTtlSeconds.reset();

    for (const [dbKey, dbInfo] of Object.entries(info.keyspace as Record<string, unknown>)) {
      const dbNumber = dbKey;

      if (typeof dbInfo === 'string') {
        const parts = dbInfo.split(',');
        let keys = 0, expires = 0, avgTtl = 0;

        for (const part of parts) {
          const [key, value] = part.split('=');
          if (key === 'keys') keys = parseInt(value) || 0;
          else if (key === 'expires') expires = parseInt(value) || 0;
          else if (key === 'avg_ttl') avgTtl = parseInt(value) || 0;
        }

        this.dbKeys.labels(dbNumber).set(keys);
        this.dbKeysExpiring.labels(dbNumber).set(expires);
        this.dbAvgTtlSeconds.labels(dbNumber).set(avgTtl / 1000);
      } else {
        const parsedInfo = dbInfo as { keys: number; expires: number; avg_ttl: number };
        this.dbKeys.labels(dbNumber).set(parsedInfo.keys || 0);
        this.dbKeysExpiring.labels(dbNumber).set(parsedInfo.expires || 0);
        this.dbAvgTtlSeconds.labels(dbNumber).set((parsedInfo.avg_ttl || 0) / 1000);
      }
    }
  }

  private async updateClusterMetricsFromInfo(info: Record<string, any>): Promise<void> {
    const clusterEnabled = info.cluster?.cluster_enabled === '1';
    this.clusterEnabled.set(clusterEnabled ? 1 : 0);

    if (!clusterEnabled) return;

    try {
      const clusterInfo = await this.dbClient.getClusterInfo();

      if (clusterInfo.cluster_known_nodes) {
        this.clusterKnownNodes.set(parseInt(clusterInfo.cluster_known_nodes) || 0);
      }
      if (clusterInfo.cluster_size) {
        this.clusterSize.set(parseInt(clusterInfo.cluster_size) || 0);
      }
      if (clusterInfo.cluster_slots_assigned) {
        this.clusterSlotsAssigned.set(parseInt(clusterInfo.cluster_slots_assigned) || 0);
      }
      if (clusterInfo.cluster_slots_ok) {
        this.clusterSlotsOk.set(parseInt(clusterInfo.cluster_slots_ok) || 0);
      }
      if (clusterInfo.cluster_slots_fail) {
        this.clusterSlotsFail.set(parseInt(clusterInfo.cluster_slots_fail) || 0);
      }
      if (clusterInfo.cluster_slots_pfail) {
        this.clusterSlotsPfail.set(parseInt(clusterInfo.cluster_slots_pfail) || 0);
      }

      const capabilities = this.dbClient.getCapabilities();
      if (capabilities.hasClusterSlotStats) {
        this.clusterSlotKeys.reset();
        this.clusterSlotExpires.reset();
        this.clusterSlotReadsTotal.reset();
        this.clusterSlotWritesTotal.reset();

        const slotStats = await this.dbClient.getClusterSlotStats('key-count', 100);

        for (const [slot, stats] of Object.entries(slotStats)) {
          this.clusterSlotKeys.labels(slot).set(stats.key_count || 0);
          this.clusterSlotExpires.labels(slot).set(stats.expires_count || 0);
          this.clusterSlotReadsTotal.labels(slot).set(stats.total_reads || 0);
          this.clusterSlotWritesTotal.labels(slot).set(stats.total_writes || 0);
        }
      }
    } catch (error) {
      this.logger.error('Failed to update cluster metrics', error);
    }
  }

  private async updateAclMetrics(): Promise<void> {
    try {
      const stats = await this.storage.getAuditStats();

      // Update total
      this.aclDeniedTotal.set(stats.totalEntries);

      // Reset and update by reason
      this.aclDeniedByReason.reset();
      for (const [reason, count] of Object.entries(stats.entriesByReason)) {
        this.aclDeniedByReason.labels(reason).set(count);
      }

      // Reset and update by user
      this.aclDeniedByUser.reset();
      for (const [user, count] of Object.entries(stats.entriesByUser)) {
        this.aclDeniedByUser.labels(user).set(count);
      }
    } catch (error) {
      this.logger.error('Failed to update ACL audit metrics', error);
    }
  }

  private async updateClientMetrics(): Promise<void> {
    try {
      const stats = await this.storage.getClientAnalyticsStats();

      this.clientConnectionsCurrent.set(stats.currentConnections);
      this.clientConnectionsPeak.set(stats.peakConnections);

      // Reset gauges before updating
      this.clientConnectionsByName.reset();
      this.clientConnectionsByUser.reset();

      for (const [name, data] of Object.entries(stats.connectionsByName)) {
        this.clientConnectionsByName.labels(name || 'unnamed').set(data.current);
      }

      for (const [user, data] of Object.entries(stats.connectionsByUser)) {
        this.clientConnectionsByUser.labels(user).set(data.current);
      }
    } catch (error) {
      this.logger.error('Failed to update client analytics metrics', error);
    }
  }

  private async updateSlowlogMetrics(): Promise<void> {
    try {
      const entries = await this.dbClient.getSlowLog(128);
      const analysis = analyzeSlowLogPatterns(entries);

      // Reset all pattern metrics
      this.slowlogPatternCount.reset();
      this.slowlogPatternDuration.reset();
      this.slowlogPatternPercentage.reset();

      // Update with top patterns
      for (const p of analysis.patterns) {
        this.slowlogPatternCount.labels(p.pattern).set(p.count);
        this.slowlogPatternDuration.labels(p.pattern).set(p.avgDuration);
        this.slowlogPatternPercentage.labels(p.pattern).set(p.percentage);
      }
    } catch (error) {
      this.logger.error('Failed to update slowlog metrics', error);
    }
  }

  private async updateCommandlogMetrics(): Promise<void> {
    try {
      const capabilities = this.dbClient.getCapabilities();
      if (!capabilities.hasCommandLog) {
        return;
      }

      // Update large request patterns
      const largeRequests = await this.dbClient.getCommandLog(128, 'large-request');
      const requestAnalysis = analyzeSlowLogPatterns(largeRequests as any);

      this.commandlogLargeRequestByPattern.reset();
      let requestTotal = 0;
      for (const p of requestAnalysis.patterns) {
        this.commandlogLargeRequestByPattern.labels(p.pattern).set(p.count);
        requestTotal += p.count;
      }
      this.commandlogLargeRequestCount.set(requestTotal);

      // Update large reply patterns
      const largeReplies = await this.dbClient.getCommandLog(128, 'large-reply');
      const replyAnalysis = analyzeSlowLogPatterns(largeReplies as any);

      this.commandlogLargeReplyByPattern.reset();
      let replyTotal = 0;
      for (const p of replyAnalysis.patterns) {
        this.commandlogLargeReplyByPattern.labels(p.pattern).set(p.count);
        replyTotal += p.count;
      }
      this.commandlogLargeReplyCount.set(replyTotal);
    } catch (error) {
      this.logger.error('Failed to update commandlog metrics', error);
    }
  }

  private async updateSlowlogRawMetrics(): Promise<void> {
    try {
      const length = await this.dbClient.getSlowLogLength();
      this.slowlogLength.set(length);

      const entries = await this.dbClient.getSlowLog(1);
      if (entries.length > 0) {
        this.slowlogLastId.set(entries[0].id);
      }
    } catch (error) {
      this.logger.error('Failed to update slowlog raw metrics', error);
    }
  }

  async getMetrics(): Promise<string> {
    await this.updateMetrics();
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
