import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LicenseService } from './license.service';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly license: LicenseService,
  ) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.get<string>('requiredFeature', context.getHandler());

    if (!requiredFeature) {
      return true;
    }

    if (!this.license.hasFeature(requiredFeature)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `This feature requires a Pro or Enterprise license`,
          feature: requiredFeature,
          currentTier: this.license.getLicenseTier(),
          upgradeUrl: 'https://betterdb.dev/pricing',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
