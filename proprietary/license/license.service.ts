import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LicenseService {
  private readonly licenseKey: string;

  constructor(private readonly config: ConfigService) {
    this.licenseKey = process.env.BETTERDB_LICENSE_KEY || 'community';
  }

  hasFeature(feature: string): boolean {
    const tier = this.getLicenseTier();
    const featureMap: Record<string, string[]> = {
      keyAnalytics: ['pro', 'enterprise', 'dev-pro', 'dev-enterprise'],
      aiAssistant: ['enterprise', 'dev-enterprise'],
    };

    const requiredTiers = featureMap[feature];
    if (!requiredTiers) return true;
    return requiredTiers.includes(tier);
  }

  getLicenseTier(): string {
    if (this.licenseKey === 'community') return 'community';
    if (this.licenseKey.startsWith('dev-')) return this.licenseKey;
    return 'pro';
  }

  getLicenseInfo() {
    const tier = this.getLicenseTier();
    return {
      tier,
      features: {
        keyAnalytics: this.hasFeature('keyAnalytics'),
        aiAssistant: this.hasFeature('aiAssistant'),
      },
      isValid: tier !== 'community',
    };
  }
}
