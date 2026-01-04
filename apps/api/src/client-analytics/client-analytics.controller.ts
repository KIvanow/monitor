import { Controller, Get, Delete, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ClientAnalyticsService } from './client-analytics.service';
import {
  StoredClientSnapshot,
  ClientTimeSeriesPoint,
  ClientAnalyticsStats,
} from '../common/interfaces/storage-port.interface';

@Controller('client-analytics')
export class ClientAnalyticsController {
  constructor(private service: ClientAnalyticsService) {}

  @Get('snapshots')
  async getSnapshots(
    @Query('name') name?: string,
    @Query('user') user?: string,
    @Query('addr') addr?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<StoredClientSnapshot[]> {
    return this.service.getSnapshots({
      clientName: name,
      user,
      addr,
      startTime: startTime ? parseInt(startTime, 10) : undefined,
      endTime: endTime ? parseInt(endTime, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('timeseries')
  async getTimeSeries(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('bucketSize') bucketSize?: string,
  ): Promise<ClientTimeSeriesPoint[]> {
    return this.service.getTimeSeries(
      parseInt(startTime, 10),
      parseInt(endTime, 10),
      bucketSize ? parseInt(bucketSize, 10) : 60000,
    );
  }

  @Get('stats')
  async getStats(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<ClientAnalyticsStats> {
    return this.service.getStats(
      startTime ? parseInt(startTime, 10) : undefined,
      endTime ? parseInt(endTime, 10) : undefined,
    );
  }

  @Get('history')
  async getConnectionHistory(
    @Query('name') name?: string,
    @Query('user') user?: string,
    @Query('addr') addr?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<StoredClientSnapshot[]> {
    if (!name && !user && !addr) {
      throw new HttpException('Must provide name, user, or addr', HttpStatus.BAD_REQUEST);
    }
    return this.service.getConnectionHistory(
      { name, user, addr },
      startTime ? parseInt(startTime, 10) : undefined,
      endTime ? parseInt(endTime, 10) : undefined,
    );
  }

  @Delete('cleanup')
  async cleanup(): Promise<{ pruned: number }> {
    const pruned = await this.service.cleanup();
    return { pruned };
  }
}
