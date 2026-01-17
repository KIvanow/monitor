import { Module, Global } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { StorageModule } from '../storage/storage.module';

@Global()
@Module({
  imports: [StorageModule],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
