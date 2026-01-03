import { Controller, Get, Post, Delete, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import {
  InfoResponse,
  SlowLogEntry,
  CommandLogEntry,
  CommandLogType,
  LatencyEvent,
  LatencyHistoryEntry,
  LatencyHistogram,
  MemoryStats,
  ClientInfo,
  ClientFilters,
  AclLogEntry,
  RoleInfo,
  ClusterNode,
  SlotStats,
  ConfigGetResponse,
  SlowLogPatternAnalysis,
} from '../common/types/metrics.types';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('info')
  async getInfo(@Query('sections') sections?: string): Promise<InfoResponse> {
    try {
      const sectionArray = sections ? sections.split(',') : undefined;
      return await this.metricsService.getInfoParsed(sectionArray);
    } catch (error) {
      throw new HttpException(
        `Failed to get info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('slowlog')
  async getSlowLog(@Query('count') count?: string): Promise<SlowLogEntry[]> {
    try {
      const parsedCount = count ? parseInt(count, 10) : undefined;
      return await this.metricsService.getSlowLog(parsedCount);
    } catch (error) {
      throw new HttpException(
        `Failed to get slowlog: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('slowlog/length')
  async getSlowLogLength(): Promise<{ length: number }> {
    try {
      const length = await this.metricsService.getSlowLogLength();
      return { length };
    } catch (error) {
      throw new HttpException(
        `Failed to get slowlog length: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('slowlog')
  async resetSlowLog(): Promise<{ success: boolean }> {
    try {
      await this.metricsService.resetSlowLog();
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to reset slowlog: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('slowlog/patterns')
  async getSlowLogPatternAnalysis(
    @Query('count') count?: string,
  ): Promise<SlowLogPatternAnalysis> {
    try {
      const parsedCount = count ? parseInt(count, 10) : undefined;
      return await this.metricsService.getSlowLogPatternAnalysis(parsedCount);
    } catch (error) {
      throw new HttpException(
        `Failed to analyze slowlog patterns: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('commandlog')
  async getCommandLog(@Query('count') count?: string, @Query('type') type?: string): Promise<CommandLogEntry[]> {
    try {
      const parsedCount = count ? parseInt(count, 10) : undefined;
      const parsedType = type as CommandLogType | undefined;
      return await this.metricsService.getCommandLog(parsedCount, parsedType);
    } catch (error) {
      const status = error instanceof Error && error.message.includes('not supported')
        ? HttpStatus.NOT_IMPLEMENTED
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        `Failed to get commandlog: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status,
      );
    }
  }

  @Get('commandlog/length')
  async getCommandLogLength(@Query('type') type?: string): Promise<{ length: number }> {
    try {
      const parsedType = type as CommandLogType | undefined;
      const length = await this.metricsService.getCommandLogLength(parsedType);
      return { length };
    } catch (error) {
      const status = error instanceof Error && error.message.includes('not supported')
        ? HttpStatus.NOT_IMPLEMENTED
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        `Failed to get commandlog length: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status,
      );
    }
  }

  @Delete('commandlog')
  async resetCommandLog(@Query('type') type?: string): Promise<{ success: boolean }> {
    try {
      const parsedType = type as CommandLogType | undefined;
      await this.metricsService.resetCommandLog(parsedType);
      return { success: true };
    } catch (error) {
      const status = error instanceof Error && error.message.includes('not supported')
        ? HttpStatus.NOT_IMPLEMENTED
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        `Failed to reset commandlog: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status,
      );
    }
  }

  @Get('commandlog/patterns')
  async getCommandLogPatternAnalysis(
    @Query('count') count?: string,
    @Query('type') type?: string,
  ): Promise<SlowLogPatternAnalysis> {
    try {
      const parsedCount = count ? parseInt(count, 10) : undefined;
      const parsedType = type as CommandLogType | undefined;
      return await this.metricsService.getCommandLogPatternAnalysis(
        parsedCount,
        parsedType,
      );
    } catch (error) {
      const status =
        error instanceof Error && error.message.includes('not supported')
          ? HttpStatus.NOT_IMPLEMENTED
          : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        `Failed to analyze commandlog patterns: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status,
      );
    }
  }

  @Get('latency/latest')
  async getLatestLatencyEvents(): Promise<LatencyEvent[]> {
    try {
      return await this.metricsService.getLatestLatencyEvents();
    } catch (error) {
      throw new HttpException(
        `Failed to get latest latency events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('latency/history/:eventName')
  async getLatencyHistory(@Param('eventName') eventName: string): Promise<LatencyHistoryEntry[]> {
    try {
      return await this.metricsService.getLatencyHistory(eventName);
    } catch (error) {
      throw new HttpException(
        `Failed to get latency history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('latency/histogram')
  async getLatencyHistogram(@Query('commands') commands?: string): Promise<Record<string, LatencyHistogram>> {
    try {
      const commandArray = commands ? commands.split(',') : undefined;
      return await this.metricsService.getLatencyHistogram(commandArray);
    } catch (error) {
      throw new HttpException(
        `Failed to get latency histogram: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('latency/doctor')
  async getLatencyDoctor(): Promise<{ report: string }> {
    try {
      const report = await this.metricsService.getLatencyDoctor();
      return { report };
    } catch (error) {
      throw new HttpException(
        `Failed to get latency doctor report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('latency')
  async resetLatencyEvents(@Query('eventName') eventName?: string): Promise<{ success: boolean }> {
    try {
      await this.metricsService.resetLatencyEvents(eventName);
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to reset latency events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('memory/stats')
  async getMemoryStats(): Promise<MemoryStats> {
    try {
      return await this.metricsService.getMemoryStats();
    } catch (error) {
      throw new HttpException(
        `Failed to get memory stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('memory/doctor')
  async getMemoryDoctor(): Promise<{ report: string }> {
    try {
      const report = await this.metricsService.getMemoryDoctor();
      return { report };
    } catch (error) {
      throw new HttpException(
        `Failed to get memory doctor report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('clients')
  async getClients(@Query('type') type?: string, @Query('id') id?: string): Promise<ClientInfo[]> {
    try {
      const filters: ClientFilters = {};
      if (type) filters.type = type as 'normal' | 'master' | 'replica' | 'pubsub';
      if (id) filters.id = id.split(',');
      return await this.metricsService.getClients(filters);
    } catch (error) {
      throw new HttpException(
        `Failed to get clients: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('clients/:id')
  async getClientById(@Param('id') id: string): Promise<ClientInfo> {
    try {
      const client = await this.metricsService.getClientById(id);
      if (!client) {
        throw new HttpException('Client not found', HttpStatus.NOT_FOUND);
      }
      return client;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to get client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('clients')
  async killClient(@Query('type') type?: string, @Query('id') id?: string): Promise<{ killed: number }> {
    try {
      const filters: ClientFilters = {};
      if (type) filters.type = type as 'normal' | 'master' | 'replica' | 'pubsub';
      if (id) filters.id = id.split(',');
      const killed = await this.metricsService.killClient(filters);
      return { killed };
    } catch (error) {
      throw new HttpException(
        `Failed to kill client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('acl/log')
  async getAclLog(@Query('count') count?: string): Promise<AclLogEntry[]> {
    try {
      const parsedCount = count ? parseInt(count, 10) : undefined;
      return await this.metricsService.getAclLog(parsedCount);
    } catch (error) {
      const status = error instanceof Error && error.message.includes('not supported')
        ? HttpStatus.NOT_IMPLEMENTED
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        `Failed to get ACL log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status,
      );
    }
  }

  @Delete('acl/log')
  async resetAclLog(): Promise<{ success: boolean }> {
    try {
      await this.metricsService.resetAclLog();
      return { success: true };
    } catch (error) {
      const status = error instanceof Error && error.message.includes('not supported')
        ? HttpStatus.NOT_IMPLEMENTED
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        `Failed to reset ACL log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status,
      );
    }
  }

  @Get('role')
  async getRole(): Promise<RoleInfo> {
    try {
      return await this.metricsService.getRole();
    } catch (error) {
      throw new HttpException(
        `Failed to get role: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cluster/info')
  async getClusterInfo(): Promise<Record<string, string>> {
    try {
      return await this.metricsService.getClusterInfo();
    } catch (error) {
      throw new HttpException(
        `Failed to get cluster info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cluster/nodes')
  async getClusterNodes(): Promise<ClusterNode[]> {
    try {
      return await this.metricsService.getClusterNodes();
    } catch (error) {
      throw new HttpException(
        `Failed to get cluster nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cluster/slot-stats')
  async getClusterSlotStats(
    @Query('orderBy') orderBy?: string,
    @Query('limit') limit?: string,
  ): Promise<SlotStats> {
    try {
      const parsedOrderBy = orderBy as 'key-count' | 'cpu-usec' | undefined;
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      return await this.metricsService.getClusterSlotStats(parsedOrderBy, parsedLimit);
    } catch (error) {
      const status = error instanceof Error && error.message.includes('not supported')
        ? HttpStatus.NOT_IMPLEMENTED
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        `Failed to get cluster slot stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status,
      );
    }
  }

  @Get('config/:parameter')
  async getConfigValue(@Param('parameter') parameter: string): Promise<{ value: string | null }> {
    try {
      const value = await this.metricsService.getConfigValue(parameter);
      return { value };
    } catch (error) {
      throw new HttpException(
        `Failed to get config value: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('config')
  async getConfigValues(@Query('pattern') pattern: string = '*'): Promise<ConfigGetResponse> {
    try {
      return await this.metricsService.getConfigValues(pattern);
    } catch (error) {
      throw new HttpException(
        `Failed to get config values: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dbsize')
  async getDbSize(): Promise<{ size: number }> {
    try {
      const size = await this.metricsService.getDbSize();
      return { size };
    } catch (error) {
      throw new HttpException(
        `Failed to get database size: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('lastsave')
  async getLastSaveTime(): Promise<{ timestamp: number }> {
    try {
      const timestamp = await this.metricsService.getLastSaveTime();
      return { timestamp };
    } catch (error) {
      throw new HttpException(
        `Failed to get last save time: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
