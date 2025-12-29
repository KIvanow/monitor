export interface DatabaseCapabilities {
  dbType: 'valkey' | 'redis';
  version: string;
  hasCommandLog: boolean;
  hasSlotStats: boolean;
}

export interface DatabasePort {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  ping(): Promise<boolean>;
  getInfo(sections?: string[]): Promise<Record<string, unknown>>;
  getCapabilities(): DatabaseCapabilities;
}
