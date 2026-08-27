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
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'routemate_test',
    });
    app = await buildApp({ env });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return 200 and healthy status', async () => {
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
  });

  it('GET /ready should return response indicating service readiness', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    // In test environment without a live MongoDB connection, 503 is expected and well-formed
    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
    expect(body.data.service).toBe('routemate-backend');
    expect(body.data.dependencies.mongodb).toBeDefined();
  });

  it('GET /api/v1 should return 200 with API version info', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.version).toBe('v1');
    expect(body.data.name).toBe('RouteMate API');
  });
});
