export interface DatabaseCapabilities {
  dbType: 'valkey' | 'redis';
  version: string;
  hasCommandLog: boolean;
  hasSlotStats: boolean;
  hasClusterSlotStats: boolean;
  hasLatencyMonitor: boolean;
  hasAclLog: boolean;
  hasMemoryDoctor: boolean;
}

export interface HealthResponse {
  status: 'connected' | 'disconnected' | 'error';
  database: {
    type: 'valkey' | 'redis' | 'unknown';
    version: string | null;
    host: string;
    port: number;
  };
  capabilities: DatabaseCapabilities | null;
  error?: string;
}
