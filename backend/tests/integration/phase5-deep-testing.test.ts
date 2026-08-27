import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { getDb } from '../../src/db/mongo.js';
import { COLLECTIONS } from '../../src/db/collections.js';

describe('Phase 5 Deep Testing & Edge Cases (Integration)', () => {
  let app: FastifyInstance;

  let ownerToken: string;
  let ownerId: string;
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let user3Token: string;
  let user4Token: string;

  let tripId: string;
  let groupId: string;
  let rejectConnId: string;
  let cancelConnId: string;

  const travelDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_phase5_deep',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. Owner
    const oReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'phase5.owner@kiet.edu', password: 'Password123!', fullName: 'P5 Owner' },
    });
    ownerId = JSON.parse(oReg.body).data.userId;
    const oLog = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'phase5.owner@kiet.edu', password: 'Password123!' },
    });
    ownerToken = JSON.parse(oLog.body).data.accessToken;

    // 2. User 1
    const u1Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'phase5.u1@kiet.edu', password: 'Password123!', fullName: 'P5 User One' },
    });
    user1Id = JSON.parse(u1Reg.body).data.userId;
    const u1Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'phase5.u1@kiet.edu', password: 'Password123!' },
    });
    user1Token = JSON.parse(u1Log.body).data.accessToken;

    // 3. User 2
    const u2Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'phase5.u2@kiet.edu', password: 'Password123!', fullName: 'P5 User Two' },
    });
    user2Id = JSON.parse(u2Reg.body).data.userId;
    const u2Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'phase5.u2@kiet.edu', password: 'Password123!' },
    });
    user2Token = JSON.parse(u2Log.body).data.accessToken;

    // 4. User 3
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'phase5.u3@kiet.edu', password: 'Password123!', fullName: 'P5 User Three' },
    });
    const u3Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'phase5.u3@kiet.edu', password: 'Password123!' },
    });
    user3Token = JSON.parse(u3Log.body).data.accessToken;

    // 5. User 4
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'phase5.u4@kiet.edu', password: 'Password123!', fullName: 'P5 User Four' },
    });
    const u4Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'phase5.u4@kiet.edu', password: 'Password123!' },
    });
    user4Token = JSON.parse(u4Log.body).data.accessToken;

    // Create Trip for Owner
    const tripRes = await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        source: { name: 'Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
        destination: { name: 'Varanasi', coordinates: { type: 'Point', coordinates: [82.9739, 25.3176] } },
        travelDate,
        departureTime: '06:30',
        transportType: 'train',
        availableSeats: 4,
      },
    });
    tripId = JSON.parse(tripRes.body).data.id;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  describe('Connection Lifecycle State Machine & Rejection/Cancellation Constraints', () => {
    it('should reject a pending connection and prevent subsequent transitions', async () => {
      // User 1 sends request to Owner
      const connRes = await app.inject({
        method: 'POST',
        url: '/api/v1/connections',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { recipientId: ownerId, tripId, message: 'Can I join?' },
      });
      rejectConnId = JSON.parse(connRes.body).data.id;

      // Owner rejects request
      const rejectRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/connections/${rejectConnId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { status: 'rejected' },
      });

      expect(rejectRes.statusCode).toBe(200);
      expect(JSON.parse(rejectRes.body).data.status).toBe('rejected');

      // Attempt to accept a rejected request -> 400 Bad Request
      const secondAcceptRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/connections/${rejectConnId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { status: 'accepted' },
      });

      expect(secondAcceptRes.statusCode).toBe(400);
    });

    it('should allow requester to cancel a request and prevent recipient from accepting it', async () => {
      // User 2 sends request to Owner
      const connRes = await app.inject({
        method: 'POST',
        url: '/api/v1/connections',
        headers: { authorization: `Bearer ${user2Token}` },
        payload: { recipientId: ownerId, tripId, message: 'Heading to Varanasi' },
      });
      cancelConnId = JSON.parse(connRes.body).data.id;

      // User 2 cancels the request
      const cancelRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/connections/${cancelConnId}`,
        headers: { authorization: `Bearer ${user2Token}` },
        payload: { status: 'cancelled' },
      });

      expect(cancelRes.statusCode).toBe(200);
      expect(JSON.parse(cancelRes.body).data.status).toBe('cancelled');

      // Owner tries to accept cancelled request -> 400 Bad Request
      const acceptRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/connections/${cancelConnId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { status: 'accepted' },
      });

      expect(acceptRes.statusCode).toBe(400);
    });
  });

  describe('Multi-Member Travel Group Lifecycle & Dynamic Cost Sharing', () => {
    it('should create travel group and calculate initial per-person cost for owner', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/groups',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          name: 'Varanasi Express Shared Cab Group',
          description: 'Booking private cab from Varanasi station to ghats',
          tripId,
          maxCapacity: 4,
          costSharing: {
            enabled: true,
            estimatedTotalCost: 3000,
            currency: 'INR',
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body).data;
      expect(body.currentMemberCount).toBe(1);
      expect(body.costSharing.perPersonCost).toBe(3000); // ₹3000 / 1

      groupId = body.id;
    });

    it('should dynamically update perPersonCost as members sequentially join (up to max capacity)', async () => {
      // 1. User 1 Joins (2 members total) -> ₹1500 per person
      const j1 = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${groupId}/join`,
        headers: { authorization: `Bearer ${user1Token}` },
      });
      expect(j1.statusCode).toBe(200);
      expect(JSON.parse(j1.body).data.currentMemberCount).toBe(2);
      expect(JSON.parse(j1.body).data.costSharing.perPersonCost).toBe(1500);

      // 2. User 2 Joins (3 members total) -> ₹1000 per person
      const j2 = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${groupId}/join`,
        headers: { authorization: `Bearer ${user2Token}` },
      });
      expect(j2.statusCode).toBe(200);
      expect(JSON.parse(j2.body).data.currentMemberCount).toBe(3);
      expect(JSON.parse(j2.body).data.costSharing.perPersonCost).toBe(1000);

      // 3. User 3 Joins (4 members total = maxCapacity) -> ₹750 per person
      const j3 = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${groupId}/join`,
        headers: { authorization: `Bearer ${user3Token}` },
      });
      expect(j3.statusCode).toBe(200);
      expect(JSON.parse(j3.body).data.currentMemberCount).toBe(4);
      expect(JSON.parse(j3.body).data.costSharing.perPersonCost).toBe(750);

      // 4. User 4 tries to join -> 409 Conflict (maxCapacity exceeded)
      const j4 = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${groupId}/join`,
        headers: { authorization: `Bearer ${user4Token}` },
      });
      expect(j4.statusCode).toBe(409);
    });

    it('should dynamically recalculate perPersonCost when a member leaves', async () => {
      // User 2 leaves group (4 -> 3 members) -> ₹1000 per person
      const leaveRes = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${groupId}/leave`,
        headers: { authorization: `Bearer ${user2Token}` },
      });
      expect(leaveRes.statusCode).toBe(200);

      // Check group details
      const groupRes = await app.inject({
        method: 'GET',
        url: `/api/v1/groups/${groupId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      const groupData = JSON.parse(groupRes.body).data;
      expect(groupData.currentMemberCount).toBe(3);
      expect(groupData.costSharing.perPersonCost).toBe(1000);
    });

    it('should dynamically recalculate perPersonCost when owner removes a member', async () => {
      // Owner removes User 3 (3 -> 2 members) -> ₹1500 per person
      const removeRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/groups/${groupId}/members/${user1Id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      expect(removeRes.statusCode).toBe(200);

      const groupRes = await app.inject({
        method: 'GET',
        url: `/api/v1/groups/${groupId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      const groupData = JSON.parse(groupRes.body).data;
      expect(groupData.currentMemberCount).toBe(2);
      expect(groupData.costSharing.perPersonCost).toBe(1500);
    });
  });

  describe('Group Settings, Status Filtering & Block Security', () => {
    it('should allow owner to close group and prevent subsequent joins', async () => {
      // Owner closes group
      const closeRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/groups/${groupId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { status: 'closed' },
      });

      expect(closeRes.statusCode).toBe(200);
      expect(JSON.parse(closeRes.body).data.status).toBe('closed');

      // User 4 tries to join closed group -> 400 Bad Request
      const joinRes = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${groupId}/join`,
        headers: { authorization: `Bearer ${user4Token}` },
      });

      expect(joinRes.statusCode).toBe(400);
    });

    it('should search groups by query substring and filter by tripId', async () => {
      const searchRes = await app.inject({
        method: 'GET',
        url: `/api/v1/groups?search=Varanasi&tripId=${tripId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(searchRes.statusCode).toBe(200);
      const searchData = JSON.parse(searchRes.body).data;
      expect(searchData.length).toBe(1);
      expect(searchData[0].name).toContain('Varanasi');
    });

    it('should forbid non-owner from updating group settings', async () => {
      const forbiddenRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/groups/${groupId}`,
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'Hacked Group Name' },
      });

      expect(forbiddenRes.statusCode).toBe(403);
    });

    it('should forbid joining group if user has a block relationship with owner', async () => {
      // Open group again
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/groups/${groupId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { status: 'open' },
      });

      // Insert block record between Owner and User 4
      const db = getDb();
      await db.collection(COLLECTIONS.BLOCKS).insertOne({
        blockerId: ownerId,
        blockedUserId: user2Id,
        createdAt: new Date(),
      });

      // Blocked User 2 attempts to join
      const blockedJoinRes = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${groupId}/join`,
        headers: { authorization: `Bearer ${user2Token}` },
      });

      expect(blockedJoinRes.statusCode).toBe(403);
    });
  });
});
