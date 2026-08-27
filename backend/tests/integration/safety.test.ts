import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';

describe('Safety, Emergency & SOS Module (Integration)', () => {
  let app: FastifyInstance;
  let userToken: string;
  let userId: string;
  let emergencyContactId: string;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_safety',
    });
    app = await buildApp({ env });
    await app.ready();

    const reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'safe.user@kiet.edu', password: 'Password123!', fullName: 'Safe User' },
    });
    userId = JSON.parse(reg.body).data.userId;
    const log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'safe.user@kiet.edu', password: 'Password123!' },
    });
    userToken = JSON.parse(log.body).data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('POST /api/v1/safety/emergency-contacts: should add emergency contacts and set primary', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/emergency-contacts',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        name: 'Ramesh Sharma',
        phone: '9876543210',
        relationship: 'Father',
      },
    });

    expect(res1.statusCode).toBe(201);
    const body1 = JSON.parse(res1.body).data;
    expect(body1.isPrimary).toBe(true); // First contact automatically primary
    emergencyContactId = body1.id;

    // Add second contact with isPrimary = true (should become new primary)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/emergency-contacts',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        name: 'Sunita Sharma',
        phone: '9876543211',
        relationship: 'Mother',
        isPrimary: true,
      },
    });

    expect(res2.statusCode).toBe(201);
    expect(JSON.parse(res2.body).data.isPrimary).toBe(true);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/safety/emergency-contacts',
      headers: { authorization: `Bearer ${userToken}` },
    });
    const list = JSON.parse(listRes.body).data;
    expect(list.length).toBe(2);
  });

  it('DELETE /api/v1/safety/emergency-contacts/:id: should remove emergency contact', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/safety/emergency-contacts/${emergencyContactId}`,
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/safety/emergency-contacts',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(JSON.parse(listRes.body).data.length).toBe(1);
  });

  it('POST /api/v1/safety/reports: should file report', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/reports',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        category: 'unsafe_driving',
        reason: 'The companion was driving recklessly over the speed limit.',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body).data;
    expect(body.category).toBe('unsafe_driving');
    expect(body.status).toBe('pending');
    expect(body.reporterId).toBe(userId);
  });

  it('POST /api/v1/safety/sos: should trigger active emergency SOS event', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/sos',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        location: {
          type: 'Point',
          coordinates: [77.4304, 28.6692],
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body).data;
    expect(body.status).toBe('active');
    expect(body.userId).toBe(userId);
    expect(body.location.coordinates).toEqual([77.4304, 28.6692]);
  });
});
