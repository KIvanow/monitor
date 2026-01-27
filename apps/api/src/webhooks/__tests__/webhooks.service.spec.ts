import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WebhooksService } from '../webhooks.service';
import { StoragePort } from '../../common/interfaces/storage-port.interface';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let storageClient: jest.Mocked<StoragePort>;

  beforeEach(async () => {
    storageClient = {
      createWebhook: jest.fn(),
      getWebhook: jest.fn(),
      getWebhooksByInstance: jest.fn(),
      getWebhooksByEvent: jest.fn(),
      updateWebhook: jest.fn(),
      deleteWebhook: jest.fn(),
      getDeliveriesByWebhook: jest.fn(),
      getDelivery: jest.fn(),
      pruneOldDeliveries: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: 'STORAGE_CLIENT',
          useValue: storageClient,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  describe('SSRF Protection', () => {
    beforeEach(() => {
      // Mock production environment for SSRF tests
      process.env.NODE_ENV = 'production';
    });

    it('should reject localhost URLs in production', async () => {
      await expect(
        service.createWebhook({
          name: 'Test',
          url: 'http://localhost:3000/webhook',
          events: ['instance.down'] as any,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject 127.0.0.1 URLs', async () => {
      await expect(
        service.createWebhook({
          name: 'Test',
          url: 'http://127.0.0.1:3000/webhook',
          events: ['instance.down'] as any,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject 10.x.x.x private IPs', async () => {
      await expect(
        service.createWebhook({
          name: 'Test',
          url: 'http://10.0.0.1/webhook',
          events: ['instance.down'] as any,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject 172.16-31.x.x private IPs', async () => {
      await expect(
        service.createWebhook({
          name: 'Test',
          url: 'http://172.16.0.1/webhook',
          events: ['instance.down'] as any,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject 192.168.x.x private IPs', async () => {
      await expect(
        service.createWebhook({
          name: 'Test',
          url: 'http://192.168.1.1/webhook',
          events: ['instance.down'] as any,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject IPv6 localhost', async () => {
      await expect(
        service.createWebhook({
          name: 'Test',
          url: 'http://[::1]/webhook',
          events: ['instance.down'] as any,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject link-local IPs', async () => {
      await expect(
        service.createWebhook({
          name: 'Test',
          url: 'http://169.254.1.1/webhook',
          events: ['instance.down'] as any,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-HTTP(S) protocols', async () => {
      await expect(
        service.createWebhook({
          name: 'Test',
          url: 'file:///etc/passwd',
          events: ['instance.down'] as any,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Secret Generation', () => {
    it('should generate secret with whsec_ prefix', () => {
      const secret = service.generateSecret();
      expect(secret).toMatch(/^whsec_[0-9a-f]{64}$/);
    });

    it('should generate unique secrets', () => {
      const secret1 = service.generateSecret();
      const secret2 = service.generateSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('Signature Generation and Verification', () => {
    it('should generate consistent signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const sig1 = service.generateSignature(payload, secret);
      const sig2 = service.generateSignature(payload, secret);
      expect(sig1).toBe(sig2);
    });

    it('should verify valid signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const signature = service.generateSignature(payload, secret);
      expect(service.verifySignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const invalidSignature = 'invalid-signature';
      expect(service.verifySignature(payload, invalidSignature, secret)).toBe(false);
    });

    it('should reject signatures with wrong secret', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = service.generateSignature(payload, 'secret1');
      expect(service.verifySignature(payload, signature, 'secret2')).toBe(false);
    });
  });

  describe('Secret Redaction', () => {
    it('should redact webhook secret', () => {
      const webhook = {
        id: '123',
        name: 'Test',
        url: 'https://example.com',
        secret: 'whsec_1234567890abcdef',
        enabled: true,
        events: [],
        headers: {},
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2, initialDelayMs: 1000, maxDelayMs: 60000 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const redacted = service.redactSecret(webhook);
      expect(redacted.secret).toBe('whsec_1234***');
    });

    it('should handle webhooks without secrets', () => {
      const webhook = {
        id: '123',
        name: 'Test',
        url: 'https://example.com',
        enabled: true,
        events: [],
        headers: {},
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2, initialDelayMs: 1000, maxDelayMs: 60000 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const redacted = service.redactSecret(webhook as any);
      expect(redacted.secret).toBeUndefined();
    });
  });
});
