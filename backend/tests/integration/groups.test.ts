import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { getDb } from '../../src/db/mongo.js';
import { COLLECTIONS } from '../../src/db/collections.js';

describe('Groups & Coordination Module (Integration)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let member1Token: string;
  let member2Token: string;
  let member3Token: string;
  let ownerId: string;
  let member2Id: string;
  let member3Id: string;
  let groupId: string;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_groups',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. Owner
    const oReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'group.owner@kiet.edu', password: 'Password123!', fullName: 'Group Owner' },
    });
    ownerId = JSON.parse(oReg.body).data.userId;
    const oLog = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'group.owner@kiet.edu', password: 'Password123!' },
    });
    ownerToken = JSON.parse(oLog.body).data.accessToken;

    // 2. Member 1
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'member1@kiet.edu', password: 'Password123!', fullName: 'Member One' },
    });
    const m1Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'member1@kiet.edu', password: 'Password123!' },
    });
    member1Token = JSON.parse(m1Log.body).data.accessToken;

    // 3. Member 2
    const m2Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'member2@kiet.edu', password: 'Password123!', fullName: 'Member Two' },
    });
    member2Id = JSON.parse(m2Reg.body).data.userId;
    const m2Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'member2@kiet.edu', password: 'Password123!' },
    });
    member2Token = JSON.parse(m2Log.body).data.accessToken;

    // 4. Member 3
    const m3Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'member3@kiet.edu', password: 'Password123!', fullName: 'Member Three' },
    });
    member3Id = JSON.parse(m3Reg.body).data.userId;
    const m3Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'member3@kiet.edu', password: 'Password123!' },
    });
    member3Token = JSON.parse(m3Log.body).data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('POST /api/v1/groups: should create a travel group with owner membership and conversation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: 'KIET to Lucknow Train Group',
        description: 'Sharing train compartment and cab to station',
        maxCapacity: 2, // Max capacity = 2 (Owner + 1 member)
        costSharing: {
          enabled: true,
          estimatedTotalCost: 1200,
          currency: 'INR',
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('KIET to Lucknow Train Group');
    expect(body.data.currentMemberCount).toBe(1);
    expect(body.data.maxCapacity).toBe(2);
    expect(body.data.costSharing.perPersonCost).toBe(1200); // 1200 / 1 member
    expect(body.data.conversationId).toBeDefined();
    expect(body.data.members.length).toBe(1);
    expect(body.data.members[0].role).toBe('owner');

    groupId = body.data.id;
  });

  it('POST /api/v1/groups/:id/join: should add member and dynamically recalculate per-person cost', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/join`,
      headers: { authorization: `Bearer ${member1Token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.currentMemberCount).toBe(2);
    // Cost dynamically split between 2 members: 1200 / 2 = 600
    expect(body.data.costSharing.perPersonCost).toBe(600);
    expect(body.data.members.length).toBe(2);
  });

  it('POST /api/v1/groups/:id/join: should enforce atomic capacity limit and reject when full', async () => {
    // Group maxCapacity is 2, current members = 2 (Owner + Member 1)
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/join`,
      headers: { authorization: `Bearer ${member2Token}` },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('reached maximum capacity');
  });

  it('POST /api/v1/groups/:id/leave: member leaves group and cost dynamically updates', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/leave`,
      headers: { authorization: `Bearer ${member1Token}` },
    });

    expect(res.statusCode).toBe(200);

    // Verify group state
    const groupRes = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    const groupData = JSON.parse(groupRes.body).data;
    expect(groupData.currentMemberCount).toBe(1);
    expect(groupData.costSharing.perPersonCost).toBe(1200); // 1200 / 1 member
  });

  it('DELETE /api/v1/groups/:id/members/:userId: owner can remove member', async () => {
    // Member 2 joins now that space opened up
    await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/join`,
      headers: { authorization: `Bearer ${member2Token}` },
    });

    // Owner removes Member 2
    const removeRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${groupId}/members/${member2Id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(removeRes.statusCode).toBe(200);

    // Verify member count decreased
    const groupRes = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    const groupData = JSON.parse(groupRes.body).data;
    expect(groupData.currentMemberCount).toBe(1);
  });

  it('should forbid blocked users from joining group', async () => {
    const db = getDb();
    await db.collection(COLLECTIONS.BLOCKS).insertOne({
      blockerId: ownerId,
      blockedUserId: member3Id,
      createdAt: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/join`,
      headers: { authorization: `Bearer ${member3Token}` },
    });

    expect(res.statusCode).toBe(403);
  });
});
