import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { getDb } from '../../src/db/mongo.js';
import { COLLECTIONS } from '../../src/db/collections.js';

describe('Phase 4 Deep Testing & Edge Cases (Integration)', () => {
  let app: FastifyInstance;

  // Tokens & User IDs
  let femaleUser1Token: string;
  let maleUser1Token: string;
  let maleUser1Id: string;
  let femaleUser2Token: string;
  let femaleUser2Id: string;
  let studentMultiStopToken: string;
  let studentSubRouteToken: string;
  let studentReverseRouteToken: string;

  // Trip IDs
  let femaleTrip1Id: string;
  let multiStopTripId: string;
  let subRouteTripId: string;
  let reverseRouteTripId: string;

  const targetDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_phase4_deep',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. Female User 1 (same_gender preference required)
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'female1@kiet.edu', password: 'Password123!', fullName: 'Ananya Sharma' },
    });
    const f1Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'female1@kiet.edu', password: 'Password123!' },
    });
    femaleUser1Token = JSON.parse(f1Log.body).data.accessToken;

    // Update profile gender to female
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${femaleUser1Token}` },
      payload: { gender: 'female', conversationPreference: 'quiet' },
    });

    // 2. Male User 1 (any preference)
    const m1Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'male1@kiet.edu', password: 'Password123!', fullName: 'Rohan Gupta' },
    });
    const m1Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'male1@kiet.edu', password: 'Password123!' },
    });
    maleUser1Token = JSON.parse(m1Log.body).data.accessToken;
    maleUser1Id = JSON.parse(m1Reg.body).data.userId;

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${maleUser1Token}` },
      payload: { gender: 'male', conversationPreference: 'moderate' },
    });

    // 3. Female User 2 (same_gender preference)
    const f2Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'female2@kiet.edu', password: 'Password123!', fullName: 'Sneha Patel' },
    });
    const f2Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'female2@kiet.edu', password: 'Password123!' },
    });
    femaleUser2Token = JSON.parse(f2Log.body).data.accessToken;
    femaleUser2Id = JSON.parse(f2Reg.body).data.userId;

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${femaleUser2Token}` },
      payload: { gender: 'female', conversationPreference: 'quiet' },
    });

    // 4. Multi-stop Route Student
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'multistop@kiet.edu', password: 'Password123!', fullName: 'Vikas Kumar' },
    });
    const msAuth = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'multistop@kiet.edu', password: 'Password123!' },
    });
    studentMultiStopToken = JSON.parse(msAuth.body).data.accessToken;

    // 5. Sub-route Student
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'subroute@kiet.edu', password: 'Password123!', fullName: 'Aditya Verma' },
    });
    const srAuth = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'subroute@kiet.edu', password: 'Password123!' },
    });
    studentSubRouteToken = JSON.parse(srAuth.body).data.accessToken;

    // 6. Reverse-route Student
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'reverseroute@kiet.edu', password: 'Password123!', fullName: 'Kavita Roy' },
    });
    const rrAuth = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'reverseroute@kiet.edu', password: 'Password123!' },
    });
    studentReverseRouteToken = JSON.parse(rrAuth.body).data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  describe('Strict Gender Compatibility & Hard Ineligibility Filter', () => {
    it('should exclude male trips when female student specifies same_gender preference', async () => {
      // Female 1 creates trip requiring same_gender
      const f1TripRes = await app.inject({
        method: 'POST',
        url: '/api/v1/trips',
        headers: { authorization: `Bearer ${femaleUser1Token}` },
        payload: {
          source: { name: 'KIET Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4977, 28.7532] } },
          destination: { name: 'Varanasi Junction', coordinates: { type: 'Point', coordinates: [82.9739, 25.3176] } },
          travelDate: targetDate,
          departureTime: '07:30',
          transportType: 'train',
          preferences: { genderPreference: 'same_gender', conversationPreference: 'quiet' },
          availableSeats: 2,
        },
      });
      femaleTrip1Id = JSON.parse(f1TripRes.body).data.id;

      // Male 1 creates identical trip (Ghaziabad -> Varanasi, same train, same time)
      await app.inject({
        method: 'POST',
        url: '/api/v1/trips',
        headers: { authorization: `Bearer ${maleUser1Token}` },
        payload: {
          source: { name: 'KIET Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4977, 28.7532] } },
          destination: { name: 'Varanasi Junction', coordinates: { type: 'Point', coordinates: [82.9739, 25.3176] } },
          travelDate: targetDate,
          departureTime: '07:30',
          transportType: 'train',
          preferences: { genderPreference: 'any' },
          availableSeats: 1,
        },
      });

      // Female 2 creates identical trip (Ghaziabad -> Varanasi, same train, same time)
      await app.inject({
        method: 'POST',
        url: '/api/v1/trips',
        headers: { authorization: `Bearer ${femaleUser2Token}` },
        payload: {
          source: { name: 'KIET Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4977, 28.7532] } },
          destination: { name: 'Varanasi Junction', coordinates: { type: 'Point', coordinates: [82.9739, 25.3176] } },
          travelDate: targetDate,
          departureTime: '07:45',
          transportType: 'train',
          preferences: { genderPreference: 'same_gender', conversationPreference: 'quiet' },
          availableSeats: 2,
        },
      });

      // Fetch matches for Female 1
      const matchesRes = await app.inject({
        method: 'GET',
        url: `/api/v1/matches?tripId=${femaleTrip1Id}`,
        headers: { authorization: `Bearer ${femaleUser1Token}` },
      });

      expect(matchesRes.statusCode).toBe(200);
      const matchesData = JSON.parse(matchesRes.body).data;

      // Male user MUST NOT be present due to strict same_gender filter
      expect(matchesData.some((m: { candidateUser: { id: string } }) => m.candidateUser.id === maleUser1Id)).toBe(false);

      // Female 2 MUST be present with high score (>= 90)
      const female2Match = matchesData.find((m: { candidateUser: { id: string } }) => m.candidateUser.id === femaleUser2Id);
      expect(female2Match).toBeDefined();
      expect(female2Match.score).toBeGreaterThanOrEqual(90);
      expect(female2Match.explanation.some((e: string) => e.includes('Same gender (female) verified'))).toBe(true);
    });
  });

  describe('Multi-Stop Trajectory Alignment & Reverse Direction Penalty', () => {
    it('should correctly score sub-route containment with high compatibility and penalize reverse routes', async () => {
      // 1. Long Multi-Stop Route: Ghaziabad -> Aligarh -> Kanpur -> Lucknow -> Gorakhpur
      const msRes = await app.inject({
        method: 'POST',
        url: '/api/v1/trips',
        headers: { authorization: `Bearer ${studentMultiStopToken}` },
        payload: {
          source: { name: 'Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
          destination: { name: 'Gorakhpur', coordinates: { type: 'Point', coordinates: [83.3732, 26.7606] } },
          stops: [
            { name: 'Aligarh', coordinates: { type: 'Point', coordinates: [78.088, 27.8974] }, sequenceNumber: 1 },
            { name: 'Kanpur', coordinates: { type: 'Point', coordinates: [80.3319, 26.4499] }, sequenceNumber: 2 },
            { name: 'Lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] }, sequenceNumber: 3 },
          ],
          travelDate: targetDate,
          departureTime: '06:00',
          transportType: 'train',
          preferences: { genderPreference: 'any' },
        },
      });
      multiStopTripId = JSON.parse(msRes.body).data.id;

      // 2. Sub-Route: Aligarh -> Kanpur -> Lucknow
      const srRes = await app.inject({
        method: 'POST',
        url: '/api/v1/trips',
        headers: { authorization: `Bearer ${studentSubRouteToken}` },
        payload: {
          source: { name: 'Aligarh', coordinates: { type: 'Point', coordinates: [78.088, 27.8974] } },
          destination: { name: 'Lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
          stops: [
            { name: 'Kanpur', coordinates: { type: 'Point', coordinates: [80.3319, 26.4499] }, sequenceNumber: 1 },
          ],
          travelDate: targetDate,
          departureTime: '07:30',
          transportType: 'train',
          preferences: { genderPreference: 'any' },
        },
      });
      subRouteTripId = JSON.parse(srRes.body).data.id;

      // 3. Reverse Direction Route: Gorakhpur -> Lucknow -> Kanpur -> Ghaziabad
      const rrRes = await app.inject({
        method: 'POST',
        url: '/api/v1/trips',
        headers: { authorization: `Bearer ${studentReverseRouteToken}` },
        payload: {
          source: { name: 'Gorakhpur', coordinates: { type: 'Point', coordinates: [83.3732, 26.7606] } },
          destination: { name: 'Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
          stops: [
            { name: 'Lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] }, sequenceNumber: 1 },
            { name: 'Kanpur', coordinates: { type: 'Point', coordinates: [80.3319, 26.4499] }, sequenceNumber: 2 },
          ],
          travelDate: targetDate,
          departureTime: '06:00',
          transportType: 'train',
          preferences: { genderPreference: 'any' },
        },
      });
      reverseRouteTripId = JSON.parse(rrRes.body).data.id;

      // Check matches for Sub-Route Trip
      const subRouteMatchesRes = await app.inject({
        method: 'GET',
        url: `/api/v1/matches?tripId=${subRouteTripId}`,
        headers: { authorization: `Bearer ${studentSubRouteToken}` },
      });

      expect(subRouteMatchesRes.statusCode).toBe(200);
      const subMatches = JSON.parse(subRouteMatchesRes.body).data;

      // Sub-route match against Multi-stop route should have strong score
      const multiStopMatch = subMatches.find((m: { candidateTripId: string }) => m.candidateTripId === multiStopTripId);
      expect(multiStopMatch).toBeDefined();
      expect(multiStopMatch.routeScore).toBeGreaterThanOrEqual(0.70);

      // Check matches for Reverse-Route Trip
      const revMatchesRes = await app.inject({
        method: 'GET',
        url: `/api/v1/matches?tripId=${reverseRouteTripId}`,
        headers: { authorization: `Bearer ${studentReverseRouteToken}` },
      });

      const revMatches = JSON.parse(revMatchesRes.body).data;
      const revMultiStopMatch = revMatches.find((m: { candidateTripId: string }) => m.candidateTripId === multiStopTripId);
      if (revMultiStopMatch) {
        // Reverse direction must be penalized (routeScore <= 0.30)
        expect(revMultiStopMatch.routeScore).toBeLessThanOrEqual(0.30);
      }
    });
  });

  describe('Security, Access Control & Suspended Account Filtering', () => {
    it('should forbid viewing matches for a trip belonging to another student', async () => {
      const unauthorizedRes = await app.inject({
        method: 'GET',
        url: `/api/v1/matches?tripId=${femaleTrip1Id}`,
        headers: { authorization: `Bearer ${maleUser1Token}` },
      });

      expect(unauthorizedRes.statusCode).toBe(403);
    });

    it('should forbid dismissing a match belonging to another student', async () => {
      // Find female 1's match ID
      const femaleMatchesRes = await app.inject({
        method: 'GET',
        url: `/api/v1/matches?tripId=${femaleTrip1Id}`,
        headers: { authorization: `Bearer ${femaleUser1Token}` },
      });
      const femaleMatch = JSON.parse(femaleMatchesRes.body).data[0];

      // Male tries to dismiss female's match
      const dismissRes = await app.inject({
        method: 'POST',
        url: `/api/v1/matches/${femaleMatch.id}/dismiss`,
        headers: { authorization: `Bearer ${maleUser1Token}` },
      });

      expect(dismissRes.statusCode).toBe(403);
    });

    it('should immediately exclude trips from suspended users in candidate retrieval', async () => {
      const db = getDb();

      // Suspend Female User 2
      await db.collection(COLLECTIONS.USERS).updateOne(
        { email: 'female2@kiet.edu' },
        { $set: { status: 'suspended', suspendedReason: 'Terms violation' } }
      );

      // Create new trip for Female User 1
      const newTripRes = await app.inject({
        method: 'POST',
        url: '/api/v1/trips',
        headers: { authorization: `Bearer ${femaleUser1Token}` },
        payload: {
          source: { name: 'KIET Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4977, 28.7532] } },
          destination: { name: 'Varanasi Junction', coordinates: { type: 'Point', coordinates: [82.9739, 25.3176] } },
          travelDate: targetDate,
          departureTime: '08:00',
          transportType: 'train',
          preferences: { genderPreference: 'any' },
        },
      });
      const newTripId = JSON.parse(newTripRes.body).data.id;

      // On-demand generation
      const genRes = await app.inject({
        method: 'POST',
        url: `/api/v1/matches/generate/${newTripId}`,
        headers: { authorization: `Bearer ${femaleUser1Token}` },
      });

      expect(genRes.statusCode).toBe(200);
      const genData = JSON.parse(genRes.body).data;

      // Suspended Female User 2 MUST NOT be returned in candidates
      expect(genData.some((m: { candidateUser: { id: string } }) => m.candidateUser?.id === femaleUser2Id)).toBe(false);
    });
  });
});
