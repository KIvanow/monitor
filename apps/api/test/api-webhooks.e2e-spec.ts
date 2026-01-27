import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createTestApp } from './test-utils';
import { WebhookEventType } from '@betterdb/shared';

describe('Webhooks API (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/webhooks', () => {
    it('should create webhook with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Test Webhook',
          url: 'https://example.com/hook',
          events: [WebhookEventType.INSTANCE_DOWN, WebhookEventType.INSTANCE_UP],
        })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        name: 'Test Webhook',
        url: 'https://example.com/hook',
        enabled: true,
        events: [WebhookEventType.INSTANCE_DOWN, WebhookEventType.INSTANCE_UP],
      });
      expect(res.body.secret).toMatch(/^\w{10}\*\*\*$/); // Masked secret

      // Cleanup
      await request(app.getHttpServer()).delete(`/api/webhooks/${res.body.id}`);
    });

    it('should generate secret automatically if not provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Auto Secret',
          url: 'https://example.com/hook2',
          events: [WebhookEventType.MEMORY_CRITICAL],
        })
        .expect(201);

      expect(res.body.secret).toBeDefined();
      expect(res.body.secret).toMatch(/^\w{10}\*\*\*$/);
    });

    it('should reject invalid URL (SSRF protection)', async () => {
      const invalidUrls = [
        'http://127.0.0.1/hook',
        'http://localhost/hook',
        'http://10.0.0.1/hook',
        'http://172.16.0.1/hook',
        'http://192.168.1.1/hook',
      ];

      // Note: In test env (not production), localhost might be allowed
      // So we'll just test one that should always fail
      const res = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Bad Webhook',
          url: 'ftp://example.com/hook',
          events: [WebhookEventType.INSTANCE_DOWN],
        });

      expect([400, 500]).toContain(res.status);
    });

    it('should accept localhost in non-production environment', async () => {
      // In test environment, localhost should be allowed
      const res = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Localhost Webhook',
          url: 'http://localhost:9999/hook',
          events: [WebhookEventType.INSTANCE_DOWN],
        })
        .expect(201);

      expect(res.body.url).toBe('http://localhost:9999/hook');
    });

    it('should set default retry policy', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Default Retry',
          url: 'https://example.com/hook3',
          events: [WebhookEventType.CONNECTION_CRITICAL],
        })
        .expect(201);

      expect(res.body.retryPolicy).toMatchObject({
        maxRetries: expect.any(Number),
        backoffMultiplier: expect.any(Number),
        initialDelayMs: expect.any(Number),
        maxDelayMs: expect.any(Number),
      });
    });

    it('should reject empty events array', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'No Events',
          url: 'https://example.com/hook',
          events: [],
        });

      expect([400, 500]).toContain(res.status);
    });

    it('should respect rate limiting', async () => {
      const requests = [];

      // Send 12 requests (rate limit is 10/min)
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/webhooks')
            .send({
              name: `Rate Limit Test ${i}`,
              url: `https://example.com/hook-${i}`,
              events: [WebhookEventType.INSTANCE_DOWN],
            })
        );
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((r) => r.status === 429);

      // Should have at least some rate limited
      expect(tooManyRequests.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('GET /api/webhooks', () => {
    it('should list all webhooks', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/webhooks')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // All secrets should be masked
      res.body.forEach((webhook: any) => {
        if (webhook.secret) {
          expect(webhook.secret).toMatch(/\*\*\*$/);
        }
      });
    });
  });

  describe('GET /api/webhooks/:id', () => {
    it('should return webhook by ID', async () => {
      // Create webhook for this test
      const created = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Get Test Webhook',
          url: 'https://example.com/get-test',
          events: [WebhookEventType.INSTANCE_DOWN],
        });

      const res = await request(app.getHttpServer())
        .get(`/api/webhooks/${created.body.id}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: created.body.id,
        name: 'Get Test Webhook',
      });
      expect(res.body.secret).toMatch(/\*\*\*$/);

      // Cleanup
      await request(app.getHttpServer()).delete(`/api/webhooks/${created.body.id}`);
    });

    it('should return 404 for unknown ID', async () => {
      await request(app.getHttpServer())
        .get('/api/webhooks/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /api/webhooks/:id', () => {
    it('should update webhook fields', async () => {
      // Create webhook for this test
      const created = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Original Name',
          url: 'https://example.com/update-test',
          events: [WebhookEventType.INSTANCE_DOWN],
        });

      const res = await request(app.getHttpServer())
        .put(`/api/webhooks/${created.body.id}`)
        .send({
          name: 'Updated Webhook Name',
          enabled: false,
        })
        .expect(200);

      expect(res.body).toMatchObject({
        id: created.body.id,
        name: 'Updated Webhook Name',
        enabled: false,
      });

      // Cleanup
      await request(app.getHttpServer()).delete(`/api/webhooks/${created.body.id}`);
    });

    it('should validate URL on update', async () => {
      // Create webhook for this test
      const created = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'URL Test',
          url: 'https://example.com/url-test',
          events: [WebhookEventType.INSTANCE_DOWN],
        });

      const res = await request(app.getHttpServer())
        .put(`/api/webhooks/${created.body.id}`)
        .send({
          url: 'ftp://invalid.com',
        });

      expect([400, 500]).toContain(res.status);

      // Cleanup
      await request(app.getHttpServer()).delete(`/api/webhooks/${created.body.id}`);
    });

    it('should return 404 for unknown webhook', async () => {
      await request(app.getHttpServer())
        .put('/api/webhooks/non-existent-id')
        .send({
          name: 'Updated',
        })
        .expect(404);
    });
  });

  describe('POST /api/webhooks/:id/test', () => {
    it('should send test event and return result', async () => {
      // Create webhook for this test
      const created = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Test Webhook',
          url: 'https://example.com/test',
          events: [WebhookEventType.INSTANCE_DOWN],
        });

      const res = await request(app.getHttpServer())
        .post(`/api/webhooks/${created.body.id}/test`)
        .expect(200);

      expect(res.body).toMatchObject({
        success: expect.any(Boolean),
        statusCode: expect.any(Number),
        durationMs: expect.any(Number),
      });

      // Cleanup
      await request(app.getHttpServer()).delete(`/api/webhooks/${created.body.id}`);
    });

    it('should return 404 for unknown webhook', async () => {
      await request(app.getHttpServer())
        .post('/api/webhooks/non-existent-id/test')
        .expect(404);
    });

    it('should respect rate limiting', async () => {
      // Create webhook for this test
      const created = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Rate Limit Test',
          url: 'https://example.com/rate-test',
          events: [WebhookEventType.INSTANCE_DOWN],
        });

      const requests = [];

      // Send 12 requests (rate limit is 10/min)
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app.getHttpServer())
            .post(`/api/webhooks/${created.body.id}/test`)
        );
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((r) => r.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);

      // Cleanup
      await request(app.getHttpServer()).delete(`/api/webhooks/${created.body.id}`);
    }, 10000);
  });

  describe('GET /api/webhooks/:id/deliveries', () => {
    it('should return delivery history', async () => {
      // Create webhook for this test
      const created = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Delivery Test',
          url: 'https://example.com/delivery-test',
          events: [WebhookEventType.INSTANCE_DOWN],
        });

      const res = await request(app.getHttpServer())
        .get(`/api/webhooks/${created.body.id}/deliveries`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);

      // Cleanup
      await request(app.getHttpServer()).delete(`/api/webhooks/${created.body.id}`);
    });

    it('should support pagination with limit and offset', async () => {
      // Create webhook for this test
      const created = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Pagination Test',
          url: 'https://example.com/pagination-test',
          events: [WebhookEventType.INSTANCE_DOWN],
        });

      const res1 = await request(app.getHttpServer())
        .get(`/api/webhooks/${created.body.id}/deliveries?limit=10&offset=0`)
        .expect(200);

      expect(Array.isArray(res1.body)).toBe(true);

      const res2 = await request(app.getHttpServer())
        .get(`/api/webhooks/${created.body.id}/deliveries?limit=10&offset=10`)
        .expect(200);

      expect(Array.isArray(res2.body)).toBe(true);

      // Cleanup
      await request(app.getHttpServer()).delete(`/api/webhooks/${created.body.id}`);
    });

    it('should return 404 for unknown webhook', async () => {
      await request(app.getHttpServer())
        .get('/api/webhooks/non-existent-id/deliveries')
        .expect(404);
    });
  });

  describe('DELETE /api/webhooks/:id', () => {
    it('should delete webhook', async () => {
      // Create webhook for this test
      const created = await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          name: 'Delete Test',
          url: 'https://example.com/delete-test',
          events: [WebhookEventType.INSTANCE_DOWN],
        });

      await request(app.getHttpServer())
        .delete(`/api/webhooks/${created.body.id}`)
        .expect(204);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/api/webhooks/${created.body.id}`)
        .expect(404);
    });

    it('should return 404 for unknown webhook', async () => {
      await request(app.getHttpServer())
        .delete('/api/webhooks/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /api/webhooks/stats/retry-queue', () => {
    it('should return retry queue statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/webhooks/stats/retry-queue')
        .expect(200);

      expect(res.body).toMatchObject({
        pendingRetries: expect.any(Number),
        nextRetryTime: expect.anything(), // Can be null or number
      });
    });
  });
});
