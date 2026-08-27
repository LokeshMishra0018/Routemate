import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';

describe('Reviews & Ratings Module (Integration)', () => {
  let app: FastifyInstance;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;
  let tripId: string;

  const travelDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_reviews',
    });
    app = await buildApp({ env });
    await app.ready();

    // Register User 1
    const u1Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'rev.u1@kiet.edu', password: 'Password123!', fullName: 'Reviewer One' },
    });
    user1Id = JSON.parse(u1Reg.body).data.userId;
    const u1Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'rev.u1@kiet.edu', password: 'Password123!' },
    });
    user1Token = JSON.parse(u1Log.body).data.accessToken;

    // Register User 2
    const u2Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'rev.u2@kiet.edu', password: 'Password123!', fullName: 'Reviewed User' },
    });
    user2Id = JSON.parse(u2Reg.body).data.userId;
    const u2Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'rev.u2@kiet.edu', password: 'Password123!' },
    });
    user2Token = JSON.parse(u2Log.body).data.accessToken;

    // User 1 creates trip
    const tripRes = await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        source: { name: 'Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
        destination: { name: 'Lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
        travelDate,
        departureTime: '08:00',
        transportType: 'train',
      },
    });
    tripId = JSON.parse(tripRes.body).data.id;

    // User 2 connects and User 1 accepts
    const connRes = await app.inject({
      method: 'POST',
      url: '/api/v1/connections',
      headers: { authorization: `Bearer ${user2Token}` },
      payload: { recipientId: user1Id, tripId, message: 'Join trip' },
    });
    const connId = JSON.parse(connRes.body).data.id;

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/connections/${connId}`,
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { status: 'accepted' },
    });
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('POST /api/v1/reviews: should prevent self-review', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reviews',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        reviewedUserId: user1Id,
        tripId,
        rating: 5,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.message).toContain('cannot review yourself');
  });

  it('POST /api/v1/reviews: should submit valid review and recalculate trust score', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reviews',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        reviewedUserId: user2Id,
        tripId,
        rating: 5,
        cleanlinessRating: 5,
        punctualityRating: 5,
        communicationRating: 4,
        comment: 'Excellent travel companion!',
        tags: ['friendly', 'punctual'],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.rating).toBe(5);
    expect(body.data.reviewer.fullName).toBe('Reviewer One');
  });

  it('POST /api/v1/reviews: should reject duplicate review submission for same trip', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reviews',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        reviewedUserId: user2Id,
        tripId,
        rating: 4,
      },
    });

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.message).toContain('already submitted a review');
  });

  it('GET /api/v1/reviews/user/:userId: should retrieve user reviews and rating breakdown', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/reviews/user/${user2Id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.summary.averageRating).toBe(5);
    expect(body.summary.totalReviews).toBe(1);
    expect(body.summary.distribution['5']).toBe(1);
    expect(body.summary.subRatings.cleanliness).toBe(5);
  });
});
