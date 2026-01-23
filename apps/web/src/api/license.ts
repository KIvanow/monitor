import { fetchApi } from './client';
import type { Tier, Feature } from '@betterdb/shared';

export interface LicenseStatus {
  tier: Tier;
  valid: boolean;
  features: Feature[];
  expiresAt: string | null;
  customer?: {
    name: string;
    email: string;
  };
}

export const licenseApi = {
  async getStatus(): Promise<LicenseStatus> {
    return fetchApi<LicenseStatus>('/license/status');
  },
};
