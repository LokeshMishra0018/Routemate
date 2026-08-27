import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { getDb } from '../../src/db/mongo.js';
import { COLLECTIONS } from '../../src/db/collections.js';

describe('Messaging Module (Integration)', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let userCToken: string;
  let userAId: string;
  let userBId: string;
  let conversationId: string;

  const travelDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_messaging',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. User A
    const uAReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'msg.a@kiet.edu', password: 'Password123!', fullName: 'User Alpha' },
    });
    userAId = JSON.parse(uAReg.body).data.userId;
    const uALog = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'msg.a@kiet.edu', password: 'Password123!' },
    });
    userAToken = JSON.parse(uALog.body).data.accessToken;

    // 2. User B
    const uBReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'msg.b@kiet.edu', password: 'Password123!', fullName: 'User Beta' },
    });
    userBId = JSON.parse(uBReg.body).data.userId;
    const uBLog = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'msg.b@kiet.edu', password: 'Password123!' },
    });
    userBToken = JSON.parse(uBLog.body).data.accessToken;

    // 3. User C (Third party non-participant)
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'msg.c@kiet.edu', password: 'Password123!', fullName: 'User Gamma' },
    });
    const uCLog = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'msg.c@kiet.edu', password: 'Password123!' },
    });
    userCToken = JSON.parse(uCLog.body).data.accessToken;

    // User A creates trip
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
      },
    });
    const tripId = JSON.parse(tripRes.body).data.id;

    // User B sends connection request and User A accepts
    const connRes = await app.inject({
      method: 'POST',
      url: '/api/v1/connections',
      headers: { authorization: `Bearer ${userBToken}` },
      payload: { recipientId: userAId, tripId, message: 'Lets coordinate' },
    });
    const connId = JSON.parse(connRes.body).data.id;

    const acceptRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/connections/${connId}`,
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { status: 'accepted' },
    });
    conversationId = JSON.parse(acceptRes.body).data.conversationId;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('GET /api/v1/conversations: should list user conversations with participant profiles', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations',
      headers: { authorization: `Bearer ${userAToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(conversationId);
    expect(body.data[0].participants).toContain(userBId);
  });

  it('POST /api/v1/conversations/:id/messages: user sends message and updates preview', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { body: 'Hey Beta! What time are you reaching the station?' },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.body).toBe('Hey Beta! What time are you reaching the station?');
    expect(body.data.senderId).toBe(userAId);
    expect(body.data.readBy).toContain(userAId);

    // Verify conversation preview was updated
    const convRes = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${conversationId}`,
      headers: { authorization: `Bearer ${userBToken}` },
    });
    const convData = JSON.parse(convRes.body).data;
    expect(convData.lastMessage.body).toBe('Hey Beta! What time are you reaching the station?');
    expect(convData.unreadCount).toBe(1); // Unread by user B
  });

  it('GET /api/v1/conversations/:id/messages: recipient reads messages, updating readBy', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${userBToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
    expect(body.data[0].readBy).toContain(userBId);

    // Verify unread count is now 0 for User B
    const convRes = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${conversationId}`,
      headers: { authorization: `Bearer ${userBToken}` },
    });
    expect(JSON.parse(convRes.body).data.unreadCount).toBe(0);
  });

  it('POST /api/v1/conversations/:id/messages: should forbid non-participant from reading/sending messages', async () => {
    // User C tries to send message in User A & B's conversation
    const sendRes = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${userCToken}` },
      payload: { body: 'Unauthorized message' },
    });

    expect(sendRes.statusCode).toBe(403);

    // User C tries to read messages
    const readRes = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${userCToken}` },
    });

    expect(readRes.statusCode).toBe(403);
  });

  it('should block message sending if users have active block relationship', async () => {
    const db = getDb();
    await db.collection(COLLECTIONS.BLOCKS).insertOne({
      blockerId: userBId,
      blockedUserId: userAId,
      createdAt: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { body: 'Attempting to send after block' },
    });

    expect(res.statusCode).toBe(403);
  });
});
