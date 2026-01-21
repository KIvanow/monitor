import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createTestApp, HealthResponse, waitForConnectionCleanup } from './test-utils';

describe('Health API (E2E)', () => {
  let app: NestFastifyApplication;
  let healthResponse: HealthResponse;

  beforeAll(async () => {
    app = await createTestApp();
    // Fetch health once for tests that need to check db-specific behavior
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    healthResponse = res.body as HealthResponse;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return complete health response with all required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Status
      expect(response.body.status).toBe('connected');

      // Database info
      expect(response.body).toHaveProperty('database');
      expect(response.body.database.type).toMatch(/^(valkey|redis)$/);
      expect(response.body.database.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(response.body.database).toHaveProperty('host');
      expect(typeof response.body.database.port).toBe('number');

      // Capabilities
      expect(response.body).toHaveProperty('capabilities');
      const capabilities = response.body.capabilities;
      expect(typeof capabilities.hasCommandLog).toBe('boolean');
      expect(typeof capabilities.hasSlotStats).toBe('boolean');
      expect(typeof capabilities.hasAclLog).toBe('boolean');
      expect(typeof capabilities.hasLatencyMonitor).toBe('boolean');
      expect(typeof capabilities.hasMemoryDoctor).toBe('boolean');
      expect(capabilities.dbType).toMatch(/^(valkey|redis)$/);
      expect(capabilities).toHaveProperty('version');

      // Content type
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should have commandLog capability based on database type and version', async () => {
      const isValkey = healthResponse.database.type === 'valkey';
      const hasCommandLog = healthResponse.capabilities?.hasCommandLog;
      const version = healthResponse.database.version;

      expect(version).toBeDefined();

      if (isValkey && version) {
        // COMMANDLOG requires Valkey 8.1+
        const versionParts = version.split('.').map((v) => parseInt(v, 10));
        const majorVersion = versionParts[0] || 0;
        const minorVersion = versionParts[1] || 0;

        if (majorVersion > 8 || (majorVersion === 8 && minorVersion >= 1)) {
          expect(hasCommandLog).toBe(true);
        } else {
          expect(hasCommandLog).toBe(false);
        }
      } else {
        // Redis doesn't have COMMANDLOG
        expect(hasCommandLog).toBe(false);
      }
    });

    it('should handle multiple concurrent health checks', async () => {
      const promises = Array(3)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/health')
            .set('Connection', 'close')
            .expect(200),
        );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.body.status).toBe('connected');
        expect(response.body).toHaveProperty('database');
        expect(response.body).toHaveProperty('capabilities');
      });

      await waitForConnectionCleanup();
    });
  });
});
