import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';

describe('Trips & Routes Module (Integration)', () => {
  let app: FastifyInstance;
  let studentAToken: string;
  let studentBToken: string;
  let studentATripId: string;

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_trips',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. Register & login Student A
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'student.a@kiet.edu',
        password: 'Password123!',
        fullName: 'Student Alpha',
      },
    });
    const loginA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'student.a@kiet.edu',
        password: 'Password123!',
      },
    });
    studentAToken = JSON.parse(loginA.body).data.accessToken;

    // 2. Register & login Student B
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'student.b@kiet.edu',
        password: 'Password123!',
        fullName: 'Student Beta',
      },
    });
    const loginB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'student.b@kiet.edu',
        password: 'Password123!',
      },
    });
    studentBToken = JSON.parse(loginB.body).data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('POST /api/v1/trips should reject unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      payload: {
        source: { name: 'Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
        destination: { name: 'Raxaul', coordinates: { type: 'Point', coordinates: [84.8504, 26.9784] } },
        travelDate: tomorrow,
        departureTime: '17:00',
        transportType: 'train',
      },
    });
    expect(response.statusCode).toBe(401);
  });

  it('POST /api/v1/trips should create a new trip with stops and meeting point', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${studentAToken}` },
      payload: {
        source: {
          name: 'KIET Ghaziabad',
          coordinates: { type: 'Point', coordinates: [77.4977, 28.7532] },
        },
        destination: {
          name: 'Raxaul Junction',
          coordinates: { type: 'Point', coordinates: [84.8504, 26.9784] },
        },
        travelDate: tomorrow,
        departureTime: '18:30',
        transportType: 'train',
        stops: [
          {
            name: 'New Delhi Railway Station',
            coordinates: { type: 'Point', coordinates: [77.2195, 28.6429] },
            sequenceNumber: 1,
            estimatedArrivalTime: '20:00',
          },
          {
            name: 'Gorakhpur Junction',
            coordinates: { type: 'Point', coordinates: [83.3732, 26.7606] },
            sequenceNumber: 2,
            estimatedArrivalTime: '06:00',
          },
        ],
        preferences: {
          genderPreference: 'same_gender',
          conversationPreference: 'moderate',
          smokingPreference: 'no',
        },
        costSharing: {
          enabled: true,
          estimatedTotalCost: 1500,
          currency: 'INR',
        },
        availableSeats: 3,
        notes: 'Travelling for Diwali holidays. Carrying minimal luggage.',
        meetingPoint: {
          name: 'Main College Gate 1',
          coordinates: { type: 'Point', coordinates: [77.498, 28.7535] },
          notes: 'Near the security booth',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.status).toBe('planning');
    expect(body.data.stops.length).toBe(2);
    expect(body.data.meetingPoint.name).toBe('Main College Gate 1');
    expect(body.data.creator.fullName).toBe('Student Alpha');

    studentATripId = body.data.id;
  });

  it('GET /api/v1/trips/:id should retrieve trip details by ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/trips/${studentATripId}`,
      headers: { authorization: `Bearer ${studentAToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(studentATripId);
    expect(body.data.source.name).toBe('KIET Ghaziabad');
    expect(body.data.destination.name).toBe('Raxaul Junction');
  });

  it('GET /api/v1/trips/me should return current user trips', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trips/me',
      headers: { authorization: `Bearer ${studentAToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(studentATripId);
  });

  it('GET /api/v1/trips should search trips by destination and exclude caller own trip', async () => {
    // Student B searches for trips to Raxaul
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trips?destination=Raxaul',
      headers: { authorization: `Bearer ${studentBToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(studentATripId);

    // Student A searches -> should exclude their own trip from discovery results
    const responseA = await app.inject({
      method: 'GET',
      url: '/api/v1/trips?destination=Raxaul',
      headers: { authorization: `Bearer ${studentAToken}` },
    });
    const bodyA = JSON.parse(responseA.body);
    expect(bodyA.data.length).toBe(0);
  });

  it('GET /api/v1/trips should support geospatial radius search', async () => {
    // Search within 50km radius of Ghaziabad coordinates [77.43, 28.67]
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trips?lat=28.67&lng=77.43&radiusKm=50',
      headers: { authorization: `Bearer ${studentBToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(studentATripId);
  });

  it('PATCH /api/v1/trips/:id should prevent Student B from modifying Student A trip (403 Forbidden)', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/trips/${studentATripId}`,
      headers: { authorization: `Bearer ${studentBToken}` },
      payload: {
        availableSeats: 1,
        notes: 'Malicious modification attempt',
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('do not have permission');
  });

  it('PATCH /api/v1/trips/:id should allow Student A (owner) to update trip details', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/trips/${studentATripId}`,
      headers: { authorization: `Bearer ${studentAToken}` },
      payload: {
        availableSeats: 4,
        notes: 'Updated: Carrying 1 suitcase and backpack.',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.availableSeats).toBe(4);
    expect(body.data.notes).toBe('Updated: Carrying 1 suitcase and backpack.');
  });

  it('POST /api/v1/trips/:id/status should update trip lifecycle status', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/trips/${studentATripId}/status`,
      headers: { authorization: `Bearer ${studentAToken}` },
      payload: { status: 'confirmed' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('confirmed');
  });

  it('should support recurring trip schedules creation and listing', async () => {
    // 1. Create recurring commuter schedule
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/trips/recurring',
      headers: { authorization: `Bearer ${studentAToken}` },
      payload: {
        source: {
          name: 'Ghaziabad Metro',
          coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] },
        },
        destination: {
          name: 'Noida Sector 62',
          coordinates: { type: 'Point', coordinates: [77.3626, 28.628] },
        },
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        departureTime: '08:00',
        transportType: 'cab',
        preferences: {
          genderPreference: 'any',
          conversationPreference: 'quiet',
        },
      },
    });

    expect(createRes.statusCode).toBe(201);
    const createBody = JSON.parse(createRes.body);
    expect(createBody.success).toBe(true);
    expect(createBody.data.daysOfWeek).toEqual([1, 2, 3, 4, 5]);

    // 2. List recurring trips
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/trips/recurring',
      headers: { authorization: `Bearer ${studentAToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.body);
    expect(listBody.data.length).toBe(1);
    expect(listBody.data[0].daysOfWeek).toEqual([1, 2, 3, 4, 5]);
  });

  it('DELETE /api/v1/trips/:id should prevent non-owner and allow owner to delete trip', async () => {
    // Non-owner Student B attempts delete -> 403
    const failRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/trips/${studentATripId}`,
      headers: { authorization: `Bearer ${studentBToken}` },
    });
    expect(failRes.statusCode).toBe(403);

    // Owner Student A deletes -> 200
    const successRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/trips/${studentATripId}`,
      headers: { authorization: `Bearer ${studentAToken}` },
    });
    expect(successRes.statusCode).toBe(200);

    // Subsequent lookup returns 404
    const notFoundRes = await app.inject({
      method: 'GET',
      url: `/api/v1/trips/${studentATripId}`,
      headers: { authorization: `Bearer ${studentAToken}` },
    });
    expect(notFoundRes.statusCode).toBe(404);
  });
});
