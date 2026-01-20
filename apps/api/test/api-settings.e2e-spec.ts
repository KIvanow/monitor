import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createTestApp } from './test-utils';

interface Settings {
  id: number;
  auditPollIntervalMs: number;
  clientAnalyticsPollIntervalMs: number;
}

interface SettingsResponse {
  settings: Settings;
  source: string;
}

describe('Settings API (E2E)', () => {
  let app: NestFastifyApplication;
  let defaultAuditInterval: number;

  beforeAll(async () => {
    app = await createTestApp();
    // Get default value for comparison in tests
    const res = await request(app.getHttpServer()).get('/settings').expect(200);
    defaultAuditInterval = (res.body as SettingsResponse).settings.auditPollIntervalMs;
  });

  afterAll(async () => {
    await app.close();
  });

  // Reset settings before each test for isolation
  beforeEach(async () => {
    await request(app.getHttpServer()).post('/settings/reset').expect(201);
  });

  describe('GET /settings', () => {
    it('should return current settings with all required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/settings')
        .expect(200);

      expect(response.body).toHaveProperty('settings');
      expect(response.body).toHaveProperty('source');

      const settings = response.body.settings as Settings;
      expect(typeof settings.id).toBe('number');
      expect(typeof settings.auditPollIntervalMs).toBe('number');
      expect(typeof settings.clientAnalyticsPollIntervalMs).toBe('number');
      expect(settings.auditPollIntervalMs).toBeGreaterThan(0);
      expect(settings.clientAnalyticsPollIntervalMs).toBeGreaterThan(0);
    });
  });

  describe('PUT /settings', () => {
    it('should update settings and return new values', async () => {
      const newInterval = 12345;

      const updateResponse = await request(app.getHttpServer())
        .put('/settings')
        .set('Content-Type', 'application/json')
        .send({ auditPollIntervalMs: newInterval })
        .expect(200);

      const settings = (updateResponse.body as SettingsResponse).settings;
      expect(settings.auditPollIntervalMs).toBe(newInterval);
    });

    it('should persist settings across GET requests', async () => {
      const testInterval = 7500;

      await request(app.getHttpServer())
        .put('/settings')
        .set('Content-Type', 'application/json')
        .send({ auditPollIntervalMs: testInterval })
        .expect(200);

      const getResponse = await request(app.getHttpServer())
        .get('/settings')
        .expect(200);

      const settings = (getResponse.body as SettingsResponse).settings;
      expect(settings.auditPollIntervalMs).toBe(testInterval);
    });

    it('should handle partial updates without affecting other fields', async () => {
      // Get current client analytics interval
      const beforeResponse = await request(app.getHttpServer())
        .get('/settings')
        .expect(200);
      const beforeClientInterval = (beforeResponse.body as SettingsResponse).settings.clientAnalyticsPollIntervalMs;

      // Update only audit interval
      await request(app.getHttpServer())
        .put('/settings')
        .set('Content-Type', 'application/json')
        .send({ auditPollIntervalMs: 9999 })
        .expect(200);

      // Verify client analytics interval unchanged
      const afterResponse = await request(app.getHttpServer())
        .get('/settings')
        .expect(200);
      const afterSettings = (afterResponse.body as SettingsResponse).settings;
      expect(afterSettings.auditPollIntervalMs).toBe(9999);
      expect(afterSettings.clientAnalyticsPollIntervalMs).toBe(beforeClientInterval);
    });

    it('should handle negative values', async () => {
      const response = await request(app.getHttpServer())
        .put('/settings')
        .set('Content-Type', 'application/json')
        .send({ auditPollIntervalMs: -1000 });

      // API may accept (200) and clamp, or reject (400)
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('POST /settings/reset', () => {
    it('should reset to environment defaults', async () => {
      // Modify settings
      await request(app.getHttpServer())
        .put('/settings')
        .set('Content-Type', 'application/json')
        .send({ auditPollIntervalMs: 99999 })
        .expect(200);

      // Reset
      const resetResponse = await request(app.getHttpServer())
        .post('/settings/reset')
        .expect(201);

      const settings = (resetResponse.body as SettingsResponse).settings;
      expect(settings.auditPollIntervalMs).toBe(defaultAuditInterval);
      expect(settings.auditPollIntervalMs).not.toBe(99999);
    });

    it('should return complete settings object after reset', async () => {
      const response = await request(app.getHttpServer())
        .post('/settings/reset')
        .expect(201);

      expect(response.body).toHaveProperty('settings');
      const settings = (response.body as SettingsResponse).settings;
      expect(typeof settings.id).toBe('number');
      expect(typeof settings.auditPollIntervalMs).toBe('number');
      expect(typeof settings.clientAnalyticsPollIntervalMs).toBe('number');
    });
  });

  describe('Settings workflow', () => {
    it('should support full CRUD cycle: get → update → verify → reset → verify', async () => {
      // 1. Get current
      const initialResponse = await request(app.getHttpServer())
        .get('/settings')
        .expect(200);
      const initialInterval = (initialResponse.body as SettingsResponse).settings.auditPollIntervalMs;

      // 2. Update
      const updatedInterval = 8000;
      await request(app.getHttpServer())
        .put('/settings')
        .set('Content-Type', 'application/json')
        .send({ auditPollIntervalMs: updatedInterval })
        .expect(200);

      // 3. Verify update
      const updatedResponse = await request(app.getHttpServer())
        .get('/settings')
        .expect(200);
      expect((updatedResponse.body as SettingsResponse).settings.auditPollIntervalMs).toBe(updatedInterval);

      // 4. Reset
      await request(app.getHttpServer())
        .post('/settings/reset')
        .expect(201);

      // 5. Verify reset
      const resetResponse = await request(app.getHttpServer())
        .get('/settings')
        .expect(200);
      expect((resetResponse.body as SettingsResponse).settings.auditPollIntervalMs).toBe(initialInterval);
    });
  });
});
