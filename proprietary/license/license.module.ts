import { Module, Global } from '@nestjs/common';
import { LicenseService } from './license.service';
import { LicenseGuard } from './license.guard';

@Global()
@Module({
  providers: [LicenseService, LicenseGuard],
  exports: [LicenseService, LicenseGuard],
})
export class LicenseModule {}
