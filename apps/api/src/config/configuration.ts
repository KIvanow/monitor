export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  type: 'valkey' | 'redis' | 'auto';
}

export interface AppConfig {
  database: DatabaseConfig;
}

export default (): AppConfig => ({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '6379', 10),
    username: process.env.DB_USERNAME || 'default',
    password: process.env.DB_PASSWORD || '',
    type: (process.env.DB_TYPE as 'valkey' | 'redis' | 'auto') || 'auto',
  },
});
