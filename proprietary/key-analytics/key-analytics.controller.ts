import { Controller, Get, Post, Delete, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { KeyAnalyticsService } from './key-analytics.service';
import { LicenseGuard } from '@proprietary/license/license.guard';
import { RequiresFeature } from '@proprietary/license/requires-feature.decorator';

@Controller('key-analytics')
export class KeyAnalyticsController {
  constructor(private readonly keyAnalytics: KeyAnalyticsService) { }

  @Get('summary')
  @UseGuards(LicenseGuard)
  @RequiresFeature('keyAnalytics')
  async getSummary(@Query('startTime') startTime?: string, @Query('endTime') endTime?: string) {
    const start = startTime ? parseInt(startTime, 10) : undefined;
    const end = endTime ? parseInt(endTime, 10) : undefined;
    return this.keyAnalytics.getSummary(start, end);
  }

  @Get('patterns')
  @UseGuards(LicenseGuard)
  @RequiresFeature('keyAnalytics')
  async getPatterns(
    @Query('pattern') pattern?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('limit') limit?: string,
  ) {
    return this.keyAnalytics.getPatternSnapshots({
      pattern,
      startTime: startTime ? parseInt(startTime, 10) : undefined,
      endTime: endTime ? parseInt(endTime, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('trends')
  @UseGuards(LicenseGuard)
  @RequiresFeature('keyAnalytics')
  async getTrends(
    @Query('pattern') pattern: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    if (!pattern || !startTime || !endTime) {
      throw new Error('pattern, startTime, and endTime are required');
    }
    return this.keyAnalytics.getPatternTrends(pattern, parseInt(startTime, 10), parseInt(endTime, 10));
  }

  @Post('collect')
  @UseGuards(LicenseGuard)
  @RequiresFeature('keyAnalytics')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerCollection() {
    this.keyAnalytics.collectKeyAnalytics().catch(() => { });
    return { message: 'Key analytics collection triggered', status: 'processing' };
  }

  @Delete('snapshots')
  @UseGuards(LicenseGuard)
  @RequiresFeature('keyAnalytics')
  async clearOldSnapshots(@Query('olderThan') olderThan?: string) {
    const cutoffTimestamp = olderThan
      ? parseInt(olderThan, 10)
      : Date.now() - 7 * 24 * 60 * 60 * 1000; // Default: 7 days ago

    const deleted = await this.keyAnalytics.pruneOldSnapshots(cutoffTimestamp);
    return {
      message: `Deleted ${deleted} old snapshots`,
      deletedCount: deleted,
      cutoffTimestamp
    };
  }
}
