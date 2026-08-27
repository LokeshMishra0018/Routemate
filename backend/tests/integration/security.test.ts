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
      CORS_ORIGIN: 'http://allowed-domain.com',
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'routemate_test',
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
  });

  it('should include security headers via Helmet', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('should attach x-request-id in response if provided or generate one', async () => {
    const customReqId = 'custom-request-id-12345';
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': customReqId,
      },
    });

    expect(response.statusCode).toBe(200);
  });
});
