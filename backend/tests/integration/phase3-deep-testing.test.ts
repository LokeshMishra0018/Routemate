import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';

describe('Phase 3 Deep Testing & Edge Cases (Integration)', () => {
  let app: FastifyInstance;
  let studentToken: string;
  let companionToken: string;

  const datePlus1 = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const datePlus5 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const datePlus10 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_trips_deep',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. Student 1
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'traveler1@kiet.edu',
        password: 'Password123!',
        fullName: 'Traveler One',
      },
    });
    const log1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'traveler1@kiet.edu', password: 'Password123!' },
    });
    studentToken = JSON.parse(log1.body).data.accessToken;

    // 2. Companion Student
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'companion@kiet.edu',
        password: 'Password123!',
        fullName: 'Companion Traveler',
      },
    });
    const log2 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'companion@kiet.edu', password: 'Password123!' },
    });
    companionToken = JSON.parse(log2.body).data.accessToken;

    // Seed multiple trips across different dates and transport modes
    // Trip 1: Train from Ghaziabad to Lucknow on datePlus1
    await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        source: { name: 'Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
        destination: { name: 'Lucknow Charbagh', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
        travelDate: datePlus1,
        departureTime: '06:00',
        transportType: 'train',
        preferences: { genderPreference: 'any', conversationPreference: 'moderate' },
        availableSeats: 2,
      },
    });

    // Trip 2: Bus from Delhi to Jaipur on datePlus5
    await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        source: { name: 'Kashmere Gate Delhi', coordinates: { type: 'Point', coordinates: [77.2285, 28.6675] } },
        destination: { name: 'Sindhi Camp Jaipur', coordinates: { type: 'Point', coordinates: [75.8009, 26.9208] } },
        travelDate: datePlus5,
        departureTime: '14:00',
        transportType: 'bus',
        preferences: { genderPreference: 'same_gender', conversationPreference: 'quiet' },
        availableSeats: 3,
      },
    });

    // Trip 3: Flight from Delhi to Bangalore on datePlus10
    await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        source: { name: 'IGI Airport T3', coordinates: { type: 'Point', coordinates: [77.0863, 28.5562] } },
        destination: { name: 'Kempegowda Airport BLR', coordinates: { type: 'Point', coordinates: [77.7064, 13.1986] } },
        travelDate: datePlus10,
        departureTime: '20:30',
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

  it('should filter trips by date range (startDate and endDate)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/trips?startDate=${datePlus1}&endDate=${datePlus5}`,
      headers: { authorization: `Bearer ${companionToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(2); // Trip 1 (datePlus1) and Trip 2 (datePlus5)
  });

  it('should filter trips by transportType', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trips?transportType=flight',
      headers: { authorization: `Bearer ${companionToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].destination.name).toContain('Kempegowda');
  });

  it('should filter trips by gender preference', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trips?genderPreference=same_gender',
      headers: { authorization: `Bearer ${companionToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].transportType).toBe('bus');
  });

  it('should paginate trip search results accurately', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trips?page=1&pageSize=2',
      headers: { authorization: `Bearer ${companionToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.length).toBe(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.pageSize).toBe(2);
    expect(body.pagination.totalCount).toBe(3);
    expect(body.pagination.totalPages).toBe(2);
    expect(body.pagination.hasNextPage).toBe(true);

    const page2Res = await app.inject({
      method: 'GET',
      url: '/api/v1/trips?page=2&pageSize=2',
      headers: { authorization: `Bearer ${companionToken}` },
    });
    const page2Body = JSON.parse(page2Res.body);
    expect(page2Body.data.length).toBe(1);
    expect(page2Body.pagination.hasNextPage).toBe(false);
  });

  it('should return 0 results if geospatial search center is far outside threshold radius', async () => {
    // Mumbai coordinates [72.8777, 19.0760], searching with 50km radius for trips around Delhi/Ghaziabad
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trips?lat=19.0760&lng=72.8777&radiusKm=50',
      headers: { authorization: `Bearer ${companionToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.length).toBe(0);
  });

  it('should reject trip modifications if trip is already in completed or cancelled status', async () => {
    // 1. Create a trip to complete
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        source: { name: 'Campus', coordinates: { type: 'Point', coordinates: [77.4977, 28.7532] } },
        destination: { name: 'City Center', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
        travelDate: datePlus1,
        departureTime: '11:00',
        transportType: 'cab',
      },
    });
    const tripId = JSON.parse(createRes.body).data.id;

    // 2. Transition status to completed
    await app.inject({
      method: 'POST',
      url: `/api/v1/trips/${tripId}/status`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { status: 'completed' },
    });

    // 3. Attempt to update completed trip -> must fail
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/trips/${tripId}`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        availableSeats: 5,
      },
    });

    expect(updateRes.statusCode).toBe(400);
    const updateBody = JSON.parse(updateRes.body);
    expect(updateBody.error.code).toBe('VALIDATION_ERROR');
    expect(updateBody.error.message).toContain('Cannot modify a trip that is already completed');
  });
});
