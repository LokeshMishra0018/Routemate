import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';

describe('Colleges Module (Integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_colleges',
    });
    app = await buildApp({ env });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('GET /api/v1/colleges should return list of active colleges containing KIET', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/colleges',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    const kiet = body.data.find((c: { domain: string }) => c.domain === 'kiet.edu');
    expect(kiet).toBeDefined();
    expect(kiet.name).toContain('KIET');
  });

  it('GET /api/v1/colleges/:id should return college details', async () => {
    const listRes = await app.inject({ method: 'GET', url: '/api/v1/colleges' });
    const colleges = JSON.parse(listRes.body).data;
    const kietId = colleges[0].id;

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/colleges/${kietId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(kietId);
    expect(body.data.domain).toBe('kiet.edu');
  });
});
