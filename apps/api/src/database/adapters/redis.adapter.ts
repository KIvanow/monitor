import { DatabasePort, DatabaseCapabilities } from '../../common/interfaces/database-port.interface';

export interface RedisAdapterConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export class RedisAdapter implements DatabasePort {
  constructor(config: RedisAdapterConfig) {
    void config;
  }

  async connect(): Promise<void> {
    throw new Error('Redis adapter not yet implemented');
  }

  async disconnect(): Promise<void> {
    throw new Error('Redis adapter not yet implemented');
  }

  isConnected(): boolean {
    return false;
  }

  async ping(): Promise<boolean> {
    throw new Error('Redis adapter not yet implemented');
  }

  async getInfo(sections?: string[]): Promise<Record<string, unknown>> {
    void sections;
    throw new Error('Redis adapter not yet implemented');
  }

  getCapabilities(): DatabaseCapabilities {
    throw new Error('Redis adapter not yet implemented');
  }
}
