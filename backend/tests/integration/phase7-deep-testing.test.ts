import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { usersRepository } from '../../src/modules/users/users.repository.js';
import { hashPassword } from '../../src/lib/crypto.js';
import { generateAccessToken } from '../../src/lib/jwt.js';
import { ObjectId } from 'mongodb';

describe('Phase 7 Deep Testing & Edge Cases (Integration)', () => {
  let app: FastifyInstance;
  let moderatorToken: string;
  let student1Token: string;
  let student2Token: string;
  let student3Token: string;
  let student1Id: string;
  let student2Id: string;
  let student3Id: string;
  let tripId: string;
  let contactIds: string[] = [];

  const travelDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_phase7_deep',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. Moderator User
    const hashedPass = await hashPassword('AdminPass123!');

    const modUser = await usersRepository.createUser({
      email: 'p7.moderator@routemate.app',
      emailNormalized: 'p7.moderator@routemate.app',
      passwordHash: hashedPass,
      role: 'moderator',
      status: 'active',
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    moderatorToken = generateAccessToken({
      userId: modUser._id.toHexString(),
      email: 'p7.moderator@routemate.app',
      role: 'moderator',
      status: 'active',
    });

    // 2. Student 1
    const s1Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'p7.s1@kiet.edu', password: 'Password123!', fullName: 'Student One' },
    });
    student1Id = JSON.parse(s1Reg.body).data.userId;
    const s1Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'p7.s1@kiet.edu', password: 'Password123!' },
    });
    student1Token = JSON.parse(s1Log.body).data.accessToken;

    // 3. Student 2
    const s2Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'p7.s2@kiet.edu', password: 'Password123!', fullName: 'Student Two' },
    });
    student2Id = JSON.parse(s2Reg.body).data.userId;
    const s2Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'p7.s2@kiet.edu', password: 'Password123!' },
    });
    student2Token = JSON.parse(s2Log.body).data.accessToken;

    // 4. Student 3 (Third party)
    const s3Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'p7.s3@kiet.edu', password: 'Password123!', fullName: 'Student Three' },
    });
    student3Id = JSON.parse(s3Reg.body).data.userId;
    const s3Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'p7.s3@kiet.edu', password: 'Password123!' },
    });
    student3Token = JSON.parse(s3Log.body).data.accessToken;

    // Student 1 creates Trip
    const tripRes = await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${student1Token}` },
      payload: {
        source: { name: 'Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
        destination: { name: 'Lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
        travelDate,
        departureTime: '08:00',
        transportType: 'train',
      },
    });
    tripId = JSON.parse(tripRes.body).data.id;

    // Student 2 connects and Student 1 accepts
    const connRes = await app.inject({
      method: 'POST',
      url: '/api/v1/connections',
      headers: { authorization: `Bearer ${student2Token}` },
      payload: { recipientId: student1Id, tripId, message: 'Co-travel review test' },
    });
    const connId = JSON.parse(connRes.body).data.id;

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/connections/${connId}`,
      headers: { authorization: `Bearer ${student1Token}` },
      payload: { status: 'accepted' },
    });
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  // --- Reviews & Trust Score Recalculation Edge Cases ---

  it('should reject review from unauthorized non-participant', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reviews',
      headers: { authorization: `Bearer ${student3Token}` },
      payload: {
        reviewedUserId: student1Id,
        tripId,
        rating: 5,
        comment: 'Attempting review without participating',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.message).toContain('only review users you have traveled or connected with');
  });

  it('should reject self-review attempts', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reviews',
      headers: { authorization: `Bearer ${student1Token}` },
      payload: {
        reviewedUserId: student1Id,
        tripId,
        rating: 5,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.message).toContain('cannot review yourself');
  });

  it('should submit review, dynamically calculate trust score, and verify rating breakdown', async () => {
    // Submit 5-star review from Student 1 to Student 2
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reviews',
      headers: { authorization: `Bearer ${student1Token}` },
      payload: {
        reviewedUserId: student2Id,
        tripId,
        rating: 5,
        cleanlinessRating: 5,
        punctualityRating: 4,
        communicationRating: 5,
        comment: 'Super punctual and respectful travel partner.',
        tags: ['punctual', 'respectful', 'good_driver'],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body).data;
    expect(body.rating).toBe(5);
    expect(body.tags).toEqual(['punctual', 'respectful', 'good_driver']);

    // Check Student 2 public profile trust score and ratings
    const profileRes = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${student2Id}`,
      headers: { authorization: `Bearer ${student1Token}` },
    });

    expect(profileRes.statusCode).toBe(200);
    const profile = JSON.parse(profileRes.body).data;
    expect(profile.averageRating).toBe(5);
    expect(profile.trustScore).toBe(30); // 5-star rating alone gives +30 points

    // Check review distribution breakdown
    const reviewsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reviews/user/${student2Id}`,
    });

    expect(reviewsRes.statusCode).toBe(200);
    const revSummary = JSON.parse(reviewsRes.body).summary;
    expect(revSummary.distribution['5']).toBe(1);
    expect(revSummary.distribution['4']).toBe(0);
    expect(revSummary.subRatings.cleanliness).toBe(5);
    expect(revSummary.subRatings.punctuality).toBe(4);
    expect(revSummary.subRatings.communication).toBe(5);
  });

  it('should prevent duplicate reviews for the same trip', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reviews',
      headers: { authorization: `Bearer ${student1Token}` },
      payload: {
        reviewedUserId: student2Id,
        tripId,
        rating: 4,
      },
    });

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.message).toContain('already submitted a review');
  });

  it('should list reviews for a specific trip', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/reviews/trip/${tripId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
    expect(body.data[0].tripId).toBe(tripId);
  });

  // --- Emergency Contacts Edge Cases ---

  it('should enforce emergency contacts limit of 5 and primary contact switching', async () => {
    contactIds = [];

    // Add 5 contacts
    for (let i = 1; i <= 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/safety/emergency-contacts',
        headers: { authorization: `Bearer ${student1Token}` },
        payload: {
          name: `Emergency Contact ${i}`,
          phone: `987654321${i}`,
          relationship: i === 1 ? 'Parent' : 'Sibling',
          isPrimary: i === 3, // Contact 3 is explicitly set as primary
        },
      });

      expect(res.statusCode).toBe(201);
      contactIds.push(JSON.parse(res.body).data.id);
    }

    // Adding 6th contact should fail (maximum limit guard)
    const overflowRes = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/emergency-contacts',
      headers: { authorization: `Bearer ${student1Token}` },
      payload: {
        name: 'Overflow Contact',
        phone: '9876543299',
        relationship: 'Friend',
      },
    });

    expect(overflowRes.statusCode).toBe(400);
    expect(JSON.parse(overflowRes.body).error.message).toContain('cannot add more than 5');

    // Verify contact 3 is the only primary
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/safety/emergency-contacts',
      headers: { authorization: `Bearer ${student1Token}` },
    });
    const contacts = JSON.parse(listRes.body).data;
    expect(contacts.length).toBe(5);
    const primaries = contacts.filter((c: { isPrimary: boolean }) => c.isPrimary);
    expect(primaries.length).toBe(1);
    expect(primaries[0].name).toBe('Emergency Contact 3');

    // Deleting a contact
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/safety/emergency-contacts/${contactIds[0]}`,
      headers: { authorization: `Bearer ${student1Token}` },
    });
    expect(delRes.statusCode).toBe(200);

    // Deleting non-existent contact returns 404
    const del404 = await app.inject({
      method: 'DELETE',
      url: `/api/v1/safety/emergency-contacts/${new ObjectId().toHexString()}`,
      headers: { authorization: `Bearer ${student1Token}` },
    });
    expect(del404.statusCode).toBe(404);
  });

  // --- Incident Reports, Moderation & SOS Edge Cases ---

  it('should file incident reports across categories and support moderator review workflows', async () => {
    // 1. File fraud report
    const rep1 = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/reports',
      headers: { authorization: `Bearer ${student1Token}` },
      payload: {
        reportedUserId: student3Id,
        category: 'fraud',
        reason: 'Demanded off-platform cash surge before departure.',
        evidenceUrls: ['https://example.com/screenshot1.png'],
      },
    });
    expect(rep1.statusCode).toBe(201);
    const report1Id = JSON.parse(rep1.body).data.id;

    // 2. File inappropriate content report
    const rep2 = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/reports',
      headers: { authorization: `Bearer ${student2Token}` },
      payload: {
        reportedUserId: student3Id,
        category: 'inappropriate_content',
        reason: 'Offensive profile bio and avatar.',
      },
    });
    expect(rep2.statusCode).toBe(201);
    const report2Id = JSON.parse(rep2.body).data.id;

    // 3. Moderator filters reports by category and status
    const modFilterRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reports?category=fraud&status=pending',
      headers: { authorization: `Bearer ${moderatorToken}` },
    });
    expect(modFilterRes.statusCode).toBe(200);
    const fraudReports = JSON.parse(modFilterRes.body).data;
    expect(fraudReports.length).toBe(1);
    expect(fraudReports[0].id).toBe(report1Id);

    // 4. Moderator resolves report 1 and suspends malicious user
    const resolveRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/reports/${report1Id}`,
      headers: { authorization: `Bearer ${moderatorToken}` },
      payload: {
        status: 'resolved',
        resolutionNotes: 'Confirmed payment extortion. User suspended.',
        actionUser: 'suspend',
      },
    });
    expect(resolveRes.statusCode).toBe(200);

    // 5. Moderator dismisses report 2
    const dismissRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/reports/${report2Id}`,
      headers: { authorization: `Bearer ${moderatorToken}` },
      payload: {
        status: 'dismissed',
        resolutionNotes: 'Content revised by user.',
        actionUser: 'none',
      },
    });
    expect(dismissRes.statusCode).toBe(200);

    // 6. Verify student 3 safety audit history
    const auditRes = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/users/${student3Id}/safety-history`,
      headers: { authorization: `Bearer ${moderatorToken}` },
    });
    expect(auditRes.statusCode).toBe(200);
    const audit = JSON.parse(auditRes.body).data;
    expect(audit.status).toBe('suspended');
    expect(audit.reportsAgainstCount).toBe(2);
  });

  it('should trigger emergency SOS and allow moderator to resolve as false alarm', async () => {
    // 1. Student 2 triggers SOS
    const sosRes = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/sos',
      headers: { authorization: `Bearer ${student2Token}` },
      payload: {
        tripId,
        location: {
          type: 'Point',
          coordinates: [77.4304, 28.6692],
        },
      },
    });
    expect(sosRes.statusCode).toBe(201);
    const sosId = JSON.parse(sosRes.body).data.id;

    // 2. Moderator checks active SOS queue
    const activeSosRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sos-events?status=active',
      headers: { authorization: `Bearer ${moderatorToken}` },
    });
    expect(activeSosRes.statusCode).toBe(200);
    const activeList = JSON.parse(activeSosRes.body).data;
    expect(activeList.some((s: { id: string }) => s.id === sosId)).toBe(true);

    // 3. Moderator resolves SOS event as false_alarm
    const resolveSosRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/sos-events/${sosId}`,
      headers: { authorization: `Bearer ${moderatorToken}` },
      payload: {
        status: 'false_alarm',
        resolutionNotes: 'Commuter accidentally triggered SOS button.',
      },
    });
    expect(resolveSosRes.statusCode).toBe(200);
    expect(JSON.parse(resolveSosRes.body).data.status).toBe('false_alarm');
  });
});
