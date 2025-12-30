import { createContext, useContext } from 'react';
import type { DatabaseCapabilities } from '../types/metrics';

export const CapabilitiesContext = createContext<DatabaseCapabilities | null>(null);

export function useCapabilities() {
  const capabilities = useContext(CapabilitiesContext);

  return {
    capabilities,
    isValkey: capabilities?.dbType === 'valkey',
    hasCommandLog: capabilities?.hasCommandLog ?? false,
    hasSlotStats: capabilities?.hasSlotStats ?? false,
    hasClusterSlotStats: capabilities?.hasClusterSlotStats ?? false,
    hasAclLog: capabilities?.hasAclLog ?? false,
  };
}
