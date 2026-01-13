import { Controller, Get, Post, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AnomalyService } from './anomaly.service';
import {
  AnomalyEvent,
  CorrelatedAnomalyGroup,
  BufferStats,
  AnomalySummary,
  MetricType,
  AnomalyPattern,
} from './types';

@Controller('anomaly')
export class AnomalyController {
  constructor(private readonly anomalyService: AnomalyService) {}

  @Get('events')
  async getEvents(
    @Query('limit') limit?: string,
    @Query('metricType') metricType?: MetricType,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<AnomalyEvent[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const parsedStartTime = startTime ? parseInt(startTime, 10) : undefined;
    const parsedEndTime = endTime ? parseInt(endTime, 10) : undefined;

    // If no time range specified, default to last 24 hours to include persisted data
    const defaultStartTime = parsedStartTime || (Date.now() - 24 * 60 * 60 * 1000);

    return this.anomalyService.getRecentAnomalies(
      defaultStartTime,
      parsedEndTime,
      undefined,
      metricType,
      parsedLimit
    );
  }

  @Get('groups')
  async getGroups(
    @Query('limit') limit?: string,
    @Query('pattern') pattern?: AnomalyPattern,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<CorrelatedAnomalyGroup[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedStartTime = startTime ? parseInt(startTime, 10) : undefined;
    const parsedEndTime = endTime ? parseInt(endTime, 10) : undefined;

    // If no time range specified, default to last 24 hours to include persisted data
    const defaultStartTime = parsedStartTime || (Date.now() - 24 * 60 * 60 * 1000);

    return this.anomalyService.getRecentCorrelatedGroups(
      defaultStartTime,
      parsedEndTime,
      pattern,
      parsedLimit
    );
  }

  @Get('summary')
  async getSummary(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<AnomalySummary> {
    const parsedStartTime = startTime ? parseInt(startTime, 10) : undefined;
    const parsedEndTime = endTime ? parseInt(endTime, 10) : undefined;

    // Default to last 24 hours to include persisted data
    const defaultStartTime = parsedStartTime || (Date.now() - 24 * 60 * 60 * 1000);

    return this.anomalyService.getSummary(defaultStartTime, parsedEndTime);
  }

  @Get('buffers')
  getBuffers(): BufferStats[] {
    return this.anomalyService.getBufferStats();
  }

  @Post('events/:id/resolve')
  @HttpCode(HttpStatus.OK)
  resolveEvent(@Param('id') id: string): { success: boolean } {
    const success = this.anomalyService.resolveAnomaly(id);
    return { success };
  }

  @Post('groups/:correlationId/resolve')
  @HttpCode(HttpStatus.OK)
  resolveGroup(@Param('correlationId') correlationId: string): { success: boolean } {
    const success = this.anomalyService.resolveGroup(correlationId);
    return { success };
  }

  @Post('events/clear-resolved')
  @HttpCode(HttpStatus.OK)
  clearResolved(): { cleared: number } {
    const cleared = this.anomalyService.clearResolved();
    return { cleared };
  }
}
