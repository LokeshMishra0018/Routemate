import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { getDb } from '../../src/db/mongo.js';
import { COLLECTIONS } from '../../src/db/collections.js';

describe('Matching Engine Module (Integration)', () => {
  let app: FastifyInstance;
  let studentAToken: string;
  let studentBToken: string;
  let studentCToken: string;
  let studentAId: string;
  let studentBId: string;
  let tripAId: string;
  let matchId: string;

  const travelDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_matching',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. Register & Login Student A (Ghaziabad -> Lucknow, Train, 08:00)
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'student.match.a@kiet.edu', password: 'Password123!', fullName: 'Student Alpha' },
    });
    const logA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'student.match.a@kiet.edu', password: 'Password123!' },
    });
    const dataA = JSON.parse(logA.body).data;
    studentAToken = dataA.accessToken;
    studentAId = dataA.user.id;

    // 2. Register & Login Student B (Ghaziabad -> Lucknow, Train, 08:20 - High compatibility)
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'student.match.b@kiet.edu', password: 'Password123!', fullName: 'Student Beta' },
    });
    const logB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'student.match.b@kiet.edu', password: 'Password123!' },
    });
    const dataB = JSON.parse(logB.body).data;
    studentBToken = dataB.accessToken;
    studentBId = dataB.user.id;

    // 3. Register & Login Student C (Delhi -> Bangalore, Flight, 20:00 - Unrelated route)
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'student.match.c@kiet.edu', password: 'Password123!', fullName: 'Student Gamma' },
    });
    const logC = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'student.match.c@kiet.edu', password: 'Password123!' },
    });
    studentCToken = JSON.parse(logC.body).data.accessToken;

    // Create Trip for Student A
    const tripARes = await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${studentAToken}` },
      payload: {
        source: { name: 'KIET Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4977, 28.7532] } },
        destination: { name: 'Lucknow Charbagh', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
        travelDate,
        departureTime: '08:00',
        transportType: 'train',
        preferences: { genderPreference: 'any', conversationPreference: 'moderate' },
        availableSeats: 2,
      },
    });
    tripAId = JSON.parse(tripARes.body).data.id;

    // Create Trip for Student B
    await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${studentBToken}` },
      payload: {
        source: { name: 'Ghaziabad Junction', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
        destination: { name: 'Lucknow Charbagh', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
        travelDate,
        departureTime: '08:20',
        transportType: 'train',
        preferences: { genderPreference: 'any', conversationPreference: 'moderate' },
        availableSeats: 3,
      },
    });

    // Create Trip for Student C (Unrelated)
    await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${studentCToken}` },
      payload: {
        source: { name: 'IGI Airport T3', coordinates: { type: 'Point', coordinates: [77.0863, 28.5562] } },
        destination: { name: 'Kempegowda BLR', coordinates: { type: 'Point', coordinates: [77.7064, 13.1986] } },
        travelDate,
        departureTime: '20:00',
        transportType: 'flight',
        preferences: { genderPreference: 'any' },
        availableSeats: 1,
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('GET /api/v1/matches should retrieve generated matches for trip with score breakdown and explanations', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/matches?tripId=${tripAId}`,
      headers: { authorization: `Bearer ${studentAToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const match = body.data[0];
    expect(match.candidateUser.fullName).toBe('Student Beta');
    expect(match.score).toBeGreaterThanOrEqual(90);
    expect(match.destinationScore).toBe(1.0);
    expect(match.dateScore).toBe(1.0);
    expect(match.transportScore).toBe(1.0);
    expect(match.explanation.length).toBeGreaterThan(0);
    expect(match.explanation.some((e: string) => e.includes('Same destination'))).toBe(true);

    matchId = match.id;
  });

  it('GET /api/v1/matches/:id should retrieve match details by ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/matches/${matchId}`,
      headers: { authorization: `Bearer ${studentAToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(matchId);
    expect(body.data.candidateTrip).toBeDefined();
  });

  it('POST /api/v1/matches/:id/dismiss should dismiss match and remove it from active listing', async () => {
    const dismissRes = await app.inject({
      method: 'POST',
      url: `/api/v1/matches/${matchId}/dismiss`,
      headers: { authorization: `Bearer ${studentAToken}` },
    });

    expect(dismissRes.statusCode).toBe(200);
    const dismissBody = JSON.parse(dismissRes.body);
    expect(dismissBody.success).toBe(true);

    // Subsequent query should not return dismissed match
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/matches?tripId=${tripAId}`,
      headers: { authorization: `Bearer ${studentAToken}` },
    });
    const listBody = JSON.parse(listRes.body);
    expect(listBody.data.some((m: { id: string }) => m.id === matchId)).toBe(false);
  });

  it('should exclude blocked users from match calculation', async () => {
    // 1. Insert a block record between Student A and Student B
    const db = getDb();
    await db.collection(COLLECTIONS.BLOCKS).insertOne({
      blockerId: studentAId,
      blockedUserId: studentBId,
      createdAt: new Date(),
    });

    // 2. Create another trip for Student A
    const tripRes = await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${studentAToken}` },
      payload: {
        source: { name: 'KIET Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4977, 28.7532] } },
        destination: { name: 'Lucknow Charbagh', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
        travelDate,
        departureTime: '08:00',
        transportType: 'train',
      },
    });
    const newTripId = JSON.parse(tripRes.body).data.id;

    // 3. Request matches -> Blocked Student B must NOT appear
    const matchRes = await app.inject({
      method: 'GET',
      url: `/api/v1/matches?tripId=${newTripId}`,
      headers: { authorization: `Bearer ${studentAToken}` },
    });

    const matchBody = JSON.parse(matchRes.body);
    expect(matchBody.data.some((m: { candidateUser: { id: string } }) => m.candidateUser?.id === studentBId)).toBe(false);
  });
});
