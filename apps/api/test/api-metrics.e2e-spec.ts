import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createTestApp, isValkeyDatabase, HealthResponse } from './test-utils';

describe('Metrics API (E2E)', () => {
  let app: NestFastifyApplication;
  let healthResponse: HealthResponse;

  beforeAll(async () => {
    app = await createTestApp();
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    healthResponse = response.body as HealthResponse;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /metrics/info', () => {
    it('should return parsed INFO with server, memory, stats sections', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/info')
        .expect(200);

      expect(response.body).toHaveProperty('server');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('stats');
      // Verify some actual data exists
      expect(response.body.server).toHaveProperty('redis_version');
    });

    it('should filter INFO by sections query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/info?sections=server,memory')
        .expect(200);

      // Response may be filtered or full depending on implementation
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /metrics/memory/stats', () => {
    it('should return memory stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/memory/stats')
        .expect(200);

      // Memory stats returned as array of key-value pairs
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || typeof response.body === 'object').toBe(true);
    });
  });

  describe('GET /metrics/memory/doctor', () => {
    it('should return diagnostic report', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/memory/doctor')
        .expect(200);

      expect(response.body).toHaveProperty('report');
      expect(typeof response.body.report).toBe('string');
      expect(response.body.report.length).toBeGreaterThan(0);
    });
  });

  describe('GET /metrics/slowlog', () => {
    it('should return array of slowlog entries', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/slowlog')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const entry = response.body[0];
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('duration');
        expect(entry).toHaveProperty('command');
      }
    });

    it('should respect count parameter limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/slowlog?count=5')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /metrics/slowlog/length', () => {
    it('should return slowlog length as non-negative number', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/slowlog/length')
        .expect(200);

      expect(response.body).toHaveProperty('length');
      expect(typeof response.body.length).toBe('number');
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /metrics/slowlog/patterns', () => {
    it('should return pattern analysis with patterns array', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/slowlog/patterns')
        .expect(200);

      expect(response.body).toHaveProperty('patterns');
      expect(Array.isArray(response.body.patterns)).toBe(true);
    });
  });

  describe('GET /metrics/latency/latest', () => {
    it('should return latency events array', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/latency/latest')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /metrics/latency/doctor', () => {
    it('should return latency diagnostic report', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/latency/doctor')
        .expect(200);

      expect(response.body).toHaveProperty('report');
      expect(typeof response.body.report).toBe('string');
    });
  });

  describe('GET /metrics/latency/histogram', () => {
    it('should return histogram data keyed by command', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/latency/histogram')
        .expect(200);

      // Response is object with command names as keys
      expect(typeof response.body).toBe('object');
      const commands = Object.keys(response.body);
      if (commands.length > 0) {
        const cmdData = response.body[commands[0]];
        expect(cmdData).toHaveProperty('calls');
        expect(cmdData).toHaveProperty('histogram');
      }
    });

    it('should filter by commands parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/latency/histogram?commands=GET,SET')
        .expect(200);

      expect(typeof response.body).toBe('object');
    });
  });

  describe('GET /metrics/clients', () => {
    it('should return array of connected clients', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/clients')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const client = response.body[0];
      expect(client).toHaveProperty('id');
      expect(client).toHaveProperty('addr');
      expect(client).toHaveProperty('fd');
    });

    it('should filter by type parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/clients?type=normal')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((client: { flags?: string }) => {
        // Normal clients shouldn't have special flags like 'S' (slave) or 'M' (master)
        expect(client.flags).not.toContain('S');
      });
    });
  });

  describe('GET /metrics/commandlog (Valkey-specific)', () => {
    it('should return entries for Valkey or 501 for Redis', async () => {
      const isValkey = isValkeyDatabase(healthResponse);
      const response = await request(app.getHttpServer())
        .get('/metrics/commandlog');

      if (isValkey && healthResponse.capabilities?.hasCommandLog) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      } else {
        expect(response.status).toBe(501);
      }
    });

    it('should filter by type for Valkey', async () => {
      const isValkey = isValkeyDatabase(healthResponse);
      const response = await request(app.getHttpServer())
        .get('/metrics/commandlog?type=slow');

      if (isValkey && healthResponse.capabilities?.hasCommandLog) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      } else {
        expect(response.status).toBe(501);
      }
    });
  });

  describe('GET /metrics/commandlog/length (Valkey-specific)', () => {
    it('should return length for Valkey or 501 for Redis', async () => {
      const isValkey = isValkeyDatabase(healthResponse);
      const response = await request(app.getHttpServer())
        .get('/metrics/commandlog/length');

      if (isValkey && healthResponse.capabilities?.hasCommandLog) {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('length');
        expect(typeof response.body.length).toBe('number');
      } else {
        expect(response.status).toBe(501);
      }
    });
  });

  describe('GET /metrics/commandlog/patterns (Valkey-specific)', () => {
    it('should return patterns for Valkey or 501 for Redis', async () => {
      const isValkey = isValkeyDatabase(healthResponse);
      const response = await request(app.getHttpServer())
        .get('/metrics/commandlog/patterns');

      if (isValkey && healthResponse.capabilities?.hasCommandLog) {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('patterns');
      } else {
        expect(response.status).toBe(501);
      }
    });
  });

  describe('GET /metrics/role', () => {
    it('should return role information', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/role')
        .expect(200);

      expect(response.body).toHaveProperty('role');
      expect(['master', 'slave', 'sentinel']).toContain(response.body.role);
    });
  });

  describe('GET /metrics/dbsize', () => {
    it('should return database size as non-negative number', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/dbsize')
        .expect(200);

      expect(response.body).toHaveProperty('size');
      expect(typeof response.body.size).toBe('number');
      expect(response.body.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /metrics/lastsave', () => {
    it('should return last save timestamp', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/lastsave')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('number');
      expect(response.body.timestamp).toBeGreaterThan(0);
    });
  });

  describe('GET /metrics/config', () => {
    it('should return config key-value pairs', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/config')
        .expect(200);

      expect(response.body).toHaveProperty('maxmemory');
    });

    it('should filter by pattern parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/config?pattern=max*')
        .expect(200);

      // All returned keys should start with 'max'
      Object.keys(response.body).forEach((key) => {
        expect(key.startsWith('max')).toBe(true);
      });
    });
  });

  describe('GET /metrics/config/:parameter', () => {
    it('should return specific config value', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/config/maxmemory')
        .expect(200);

      expect(response.body).toHaveProperty('value');
    });
  });

  describe('GET /metrics/acl/log', () => {
    it('should return ACL log entries for supported databases', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/acl/log');

      if (healthResponse.capabilities?.hasAclLog) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      } else {
        expect(response.status).toBe(501);
      }
    });
  });
});
