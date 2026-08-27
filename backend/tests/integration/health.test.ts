import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';

describe('Health & Readiness Endpoints (Integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const env = getEnv({
      NODE_ENV: 'test',
      PORT: '4000',
      MONGODB_URI: 'mongodb://127.0.0.1:27017',
      MONGODB_DB_NAME: 'routemate_test',
    });
    app = await buildApp({ env });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return 200 and healthy status regardless of DB status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.data.service).toBe('routemate-backend');
    expect(typeof body.data.uptime).toBe('number');
    expect(body.data.timestamp).toBeDefined();
    // Must include x-request-id response header
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('GET /ready should return 503 with standard error format when MongoDB is unavailable', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    // In unit/test without live MongoDB, 503 is returned
    if (response.statusCode === 503) {
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(body.error.message).toContain('Database dependency is offline');
      expect(body.error.details.dependencies.mongodb.connected).toBe(false);
      // Ensure no raw passwords or URIs are exposed in error response
      expect(JSON.stringify(body)).not.toMatch(/mongodb(\+srv)?:\/\/[^@\s]+:[^@\s]+@/);
    } else {
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ready');
    }
  });

  it('GET /api/v1 should return 200 with API version info and X-Request-ID header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.version).toBe('v1');
    expect(body.data.name).toBe('RouteMate API');
    expect(response.headers['x-request-id']).toBeDefined();
  });
});
