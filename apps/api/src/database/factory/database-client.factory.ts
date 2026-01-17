import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabasePort } from '../../common/interfaces/database-port.interface';
import { ValkeyAdapter } from '../adapters/valkey.adapter';
import { RedisAdapter } from '../adapters/redis.adapter';
import { DatabaseConfig } from '../../config/configuration';

@Injectable()
export class DatabaseClientFactory {
  constructor(private configService: ConfigService) {}

  async create(): Promise<DatabasePort> {
    const dbConfig = this.configService.get<DatabaseConfig>('database');
    if (!dbConfig) {
      throw new Error('Database configuration not found');
    }

    const { host, port, username, password, type } = dbConfig;

    if (type === 'valkey') {
      return new ValkeyAdapter({ host, port, username, password });
    }

    if (type === 'redis') {
      return new RedisAdapter({ host, port, username, password });
    }

    return await this.autoDetect({ host, port, username, password });
  }

  private async autoDetect(config: {
    host: string;
    port: number;
    username: string;
    password: string;
  }): Promise<DatabasePort> {
    return new ValkeyAdapter(config);
  }
}
