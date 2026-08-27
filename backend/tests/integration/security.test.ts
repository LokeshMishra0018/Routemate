import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';

describe('Security & Middleware (Integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const env = getEnv({
      NODE_ENV: 'test',
      PORT: '4000',
      CORS_ORIGIN: 'http://allowed-domain.com,http://localhost:3000',
      MONGODB_URI: 'mongodb://127.0.0.1:27017',
      MONGODB_DB_NAME: 'routemate_test',
      RATE_LIMIT_MAX: '100',
      RATE_LIMIT_TIME_WINDOW_MS: '60000',
      RATE_LIMIT_ALLOW_LIST: '',
    });
    app = await buildApp({ env });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 404 formatted as standard error for nonexistent routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-route',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('/non-existent-route');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('should include security headers via Helmet', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('should preserve incoming X-Request-ID in response', async () => {
    const customReqId = 'test-trace-id-998877';
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': customReqId,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe(customReqId);
  });

  it('should generate X-Request-ID in response when none was provided', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBeDefined();
    expect(typeof response.headers['x-request-id']).toBe('string');
    expect((response.headers['x-request-id'] as string).length).toBeGreaterThan(0);
  });

  it('should allow requests from configured CORS origin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        origin: 'http://allowed-domain.com',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://allowed-domain.com');
  });

  it('should reject requests from disallowed CORS origin with 403 (not 500)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        origin: 'http://malicious-attacker.com',
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('CORS request rejected');
    // Ensure no internal stack trace or raw 500 error
    expect(body.error.stack).toBeUndefined();
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('should trigger 429 Too Many Requests when rate limit is exceeded', async () => {
    const rateLimitedEnv = getEnv({
      NODE_ENV: 'test',
      PORT: '4001',
      MONGODB_URI: 'mongodb://127.0.0.1:27017',
      MONGODB_DB_NAME: 'routemate_test',
      RATE_LIMIT_MAX: '2',
      RATE_LIMIT_TIME_WINDOW_MS: '60000',
      RATE_LIMIT_ALLOW_LIST: '', // ensure localhost is not exempt
    });

    const rateLimitApp = await buildApp({ env: rateLimitedEnv });
    await rateLimitApp.ready();

    try {
      const req1 = await rateLimitApp.inject({ method: 'GET', url: '/api/v1' });
      const req2 = await rateLimitApp.inject({ method: 'GET', url: '/api/v1' });
      const req3 = await rateLimitApp.inject({ method: 'GET', url: '/api/v1' });

      expect(req1.statusCode).toBe(200);
      expect(req2.statusCode).toBe(200);

      // 3rd request exceeds limit of 2 and must return 429 with standard envelope
      expect(req3.statusCode).toBe(429);
      const body = JSON.parse(req3.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error.message).toContain('Too many requests');
      expect(req3.headers['x-request-id']).toBeDefined();
    } finally {
      await rateLimitApp.close();
    }
  });
});
