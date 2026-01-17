import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SettingsUpdateRequest, SettingsResponse } from '@betterdb/shared';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current application settings' })
  @ApiResponse({ status: 200, description: 'Returns current settings with source information' })
  async getSettings(): Promise<SettingsResponse> {
    return this.settingsService.getSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Update application settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(@Body() updates: SettingsUpdateRequest): Promise<SettingsResponse> {
    return this.settingsService.updateSettings(updates);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset settings to defaults from environment variables' })
  @ApiResponse({ status: 200, description: 'Settings reset to defaults' })
  async resetSettings(): Promise<SettingsResponse> {
    return this.settingsService.resetToDefaults();
  }
}
