import Valkey from 'iovalkey';
import { DatabasePort, DatabaseCapabilities } from '../../common/interfaces/database-port.interface';
import { InfoParser } from '../parsers/info.parser';

export interface ValkeyAdapterConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export class ValkeyAdapter implements DatabasePort {
  private client: Valkey;
  private connected: boolean = false;
  private capabilities: DatabaseCapabilities | null = null;

  constructor(config: ValkeyAdapterConfig) {
    this.client = new Valkey({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    this.client.on('connect', () => {
      this.connected = true;
    });

    this.client.on('error', () => {
      this.connected = false;
    });

    this.client.on('close', () => {
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      await this.detectCapabilities();
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.client.status === 'ready';
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }

  async getInfo(sections?: string[]): Promise<Record<string, unknown>> {
    const infoString =
      sections && sections.length > 0
        ? await this.client.info(sections.join(' '))
        : await this.client.info();
    return InfoParser.parse(infoString);
  }

  getCapabilities(): DatabaseCapabilities {
    if (!this.capabilities) {
      throw new Error('Capabilities not yet detected. Call connect() first.');
    }
    return this.capabilities;
  }

  private async detectCapabilities(): Promise<void> {
    const info = await this.getInfo(['server']);
    const version = InfoParser.getVersion(info);

    if (!version) {
      throw new Error('Could not detect database version');
    }

    const isValkey = InfoParser.isValkey(info);
    const versionParts = version.split('.').map((v) => parseInt(v, 10));
    const majorVersion = versionParts[0] || 0;
    const minorVersion = versionParts[1] || 0;

    this.capabilities = {
      dbType: isValkey ? 'valkey' : 'redis',
      version,
      hasSlotStats: isValkey && majorVersion >= 8,
      hasCommandLog: isValkey && (majorVersion > 8 || (majorVersion === 8 && minorVersion >= 1)),
    };
  }
}
