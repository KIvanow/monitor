import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthResponse } from '@betterdb/shared';
import { DatabaseClientFactory } from '../database/factory/database-client.factory';
import { DatabasePort } from '../common/interfaces/database-port.interface';
import { DatabaseConfig } from '../config/configuration';

@Injectable()
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private dbClient: DatabasePort | null = null;
  private dbConfig: DatabaseConfig;

  constructor(
    private readonly databaseClientFactory: DatabaseClientFactory,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get<DatabaseConfig>('database');
    if (!config) {
      throw new Error('Database configuration not found');
    }
    this.dbConfig = config;
  }

  async onModuleInit(): Promise<void> {
    try {
      this.dbClient = await this.databaseClientFactory.create();
      await this.dbClient.connect();
    } catch (error) {
      console.error('Failed to connect to database on startup:', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.dbClient) {
      await this.dbClient.disconnect();
    }
  }

  async getHealth(): Promise<HealthResponse> {
    if (!this.dbClient) {
      return {
        status: 'disconnected',
        database: {
          type: 'unknown',
          version: null,
          host: this.dbConfig.host,
          port: this.dbConfig.port,
        },
        capabilities: null,
        error: 'Database client not initialized',
      };
    }

    try {
      const isConnected = this.dbClient.isConnected();

      if (!isConnected) {
        return {
          status: 'disconnected',
          database: {
            type: 'unknown',
            version: null,
            host: this.dbConfig.host,
            port: this.dbConfig.port,
          },
          capabilities: null,
          error: 'Not connected to database',
        };
      }

      const canPing = await this.dbClient.ping();

      if (!canPing) {
        return {
          status: 'error',
          database: {
            type: 'unknown',
            version: null,
            host: this.dbConfig.host,
            port: this.dbConfig.port,
          },
          capabilities: null,
          error: 'Database ping failed',
        };
      }

      const capabilities = this.dbClient.getCapabilities();

      return {
        status: 'connected',
        database: {
          type: capabilities.dbType,
          version: capabilities.version,
          host: this.dbConfig.host,
          port: this.dbConfig.port,
        },
        capabilities,
      };
    } catch (error) {
      return {
        status: 'error',
        database: {
          type: 'unknown',
          version: null,
          host: this.dbConfig.host,
          port: this.dbConfig.port,
        },
        capabilities: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
