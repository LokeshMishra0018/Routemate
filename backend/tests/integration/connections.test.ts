import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { getDb } from '../../src/db/mongo.js';
import { COLLECTIONS } from '../../src/db/collections.js';

describe('Connections & Join Requests Module (Integration)', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let userCToken: string;
  let userAId: string;
  let userBId: string;
  let userCId: string;
  let tripAId: string;
  let connectionId: string;

  const travelDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_connections',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. User A (Trip creator)
    const uAReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'conn.a@kiet.edu', password: 'Password123!', fullName: 'User Alpha' },
    });
    userAId = JSON.parse(uAReg.body).data.userId;
    const uALog = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'conn.a@kiet.edu', password: 'Password123!' },
    });
    userAToken = JSON.parse(uALog.body).data.accessToken;

    // 2. User B (Requester)
    const uBReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'conn.b@kiet.edu', password: 'Password123!', fullName: 'User Beta' },
    });
    userBId = JSON.parse(uBReg.body).data.userId;
    const uBLog = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'conn.b@kiet.edu', password: 'Password123!' },
    });
    userBToken = JSON.parse(uBLog.body).data.accessToken;

    // 3. User C (Third party)
    const uCReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'conn.c@kiet.edu', password: 'Password123!', fullName: 'User Gamma' },
    });
    userCId = JSON.parse(uCReg.body).data.userId;
    const uCLog = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'conn.c@kiet.edu', password: 'Password123!' },
    });
    userCToken = JSON.parse(uCLog.body).data.accessToken;

    // Create Trip for User A
    const tripRes = await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        source: { name: 'Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
        destination: { name: 'Lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
        travelDate,
        departureTime: '08:00',
        transportType: 'train',
        availableSeats: 3,
      },
    });
    tripAId = JSON.parse(tripRes.body).data.id;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('POST /api/v1/connections: should fail when user attempts to send request to self', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/connections',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        recipientId: userAId,
        tripId: tripAId,
        message: 'Travelling with myself',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.message).toContain('cannot send a connection request to yourself');
  });

  it('POST /api/v1/connections: should create pending connection request and notification for recipient', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/connections',
      headers: { authorization: `Bearer ${userBToken}` },
      payload: {
        recipientId: userAId,
        tripId: tripAId,
        message: 'Hey Alpha, I am travelling to Lucknow as well! Mind if we split a cab/train?',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('pending');
    expect(body.data.requester.fullName).toBe('User Beta');
    expect(body.data.recipient.fullName).toBe('User Alpha');

    connectionId = body.data.id;

    // Verify notification was stored in DB
    const db = getDb();
    const notification = await db.collection(COLLECTIONS.NOTIFICATIONS).findOne({
      userId: userAId,
      type: 'connection_request',
    });
    expect(notification).toBeDefined();
    expect(notification?.data.connectionId).toBe(connectionId);
  });

  it('POST /api/v1/connections: should prevent duplicate pending connection requests for same trip', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/connections',
      headers: { authorization: `Bearer ${userBToken}` },
      payload: {
        recipientId: userAId,
        tripId: tripAId,
        message: 'Duplicate request',
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('GET /api/v1/connections: should list connections with incoming and outgoing filters', async () => {
    // User A checks incoming requests
    const incRes = await app.inject({
      method: 'GET',
      url: '/api/v1/connections?type=incoming&status=pending',
      headers: { authorization: `Bearer ${userAToken}` },
    });
    expect(incRes.statusCode).toBe(200);
    const incData = JSON.parse(incRes.body).data;
    expect(incData.length).toBe(1);
    expect(incData[0].id).toBe(connectionId);

    // User B checks outgoing requests
    const outRes = await app.inject({
      method: 'GET',
      url: '/api/v1/connections?type=outgoing&status=pending',
      headers: { authorization: `Bearer ${userBToken}` },
    });
    expect(outRes.statusCode).toBe(200);
    const outData = JSON.parse(outRes.body).data;
    expect(outData.length).toBe(1);
  });

  it('PATCH /api/v1/connections/:id: should forbid unauthorized third-party user from accepting request', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/connections/${connectionId}`,
      headers: { authorization: `Bearer ${userCToken}` },
      payload: { status: 'accepted' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('PATCH /api/v1/connections/:id: recipient accepts request, creating conversation and notification', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/connections/${connectionId}`,
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { status: 'accepted' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('accepted');
    expect(body.data.conversationId).toBeDefined();

    // Verify conversation was created
    const db = getDb();
    const conv = await db.collection(COLLECTIONS.CONVERSATIONS).findOne({
      type: 'direct',
      participants: { $all: [userAId, userBId] },
    });
    expect(conv).toBeDefined();

    // Verify acceptance notification for requester
    const notif = await db.collection(COLLECTIONS.NOTIFICATIONS).findOne({
      userId: userBId,
      type: 'connection_accepted',
    });
    expect(notif).toBeDefined();
  });

  it('should block connection requests if user is blocked', async () => {
    const db = getDb();
    await db.collection(COLLECTIONS.BLOCKS).insertOne({
      blockerId: userAId,
      blockedUserId: userCId,
      createdAt: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/connections',
      headers: { authorization: `Bearer ${userCToken}` },
      payload: {
        recipientId: userAId,
        tripId: tripAId,
        message: 'Blocked request attempt',
      },
    });

    expect(res.statusCode).toBe(403);
  });
});
