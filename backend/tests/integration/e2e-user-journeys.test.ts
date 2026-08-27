import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { usersRepository } from '../../src/modules/users/users.repository.js';
import { hashPassword } from '../../src/lib/crypto.js';
import { generateAccessToken } from '../../src/lib/jwt.js';

describe('End-to-End Full User Journeys Simulation (E2E Integration)', () => {
  let app: FastifyInstance;

  // Student Alpha tokens & IDs
  let alphaToken: string;
  let alphaUserId: string;
  let alphaTripId: string;
  let alphaVerificationReqId: string;

  // Student Beta tokens & IDs
  let betaToken: string;
  let betaUserId: string;
  let betaTripId: string;

  // Moderator tokens
  let moderatorToken: string;
  let moderatorUserId: string;

  // Group and connection IDs
  let connectionId: string;
  let conversationId: string;
  let groupId: string;

  const travelDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_e2e_journeys',
    });
    app = await buildApp({ env });
    await app.ready();

    const hashedPass = await hashPassword('Password123!');

    // 1. Moderator
    const modUser = await usersRepository.createUser({
      email: 'moderator.e2e@routemate.app',
      emailNormalized: 'moderator.e2e@routemate.app',
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
    moderatorUserId = modUser._id.toHexString();
    moderatorToken = generateAccessToken({
      userId: moderatorUserId,
      email: 'moderator.e2e@routemate.app',
      role: 'moderator',
      status: 'active',
    });

    // 2. Student Alpha
    const alphaUser = await usersRepository.createUser({
      email: 'alpha.e2e@kiet.edu',
      emailNormalized: 'alpha.e2e@kiet.edu',
      passwordHash: hashedPass,
      role: 'student',
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
    alphaUserId = alphaUser._id.toHexString();
    alphaToken = generateAccessToken({
      userId: alphaUserId,
      email: 'alpha.e2e@kiet.edu',
      role: 'student',
      status: 'active',
    });
    await usersRepository.createProfile({
      userId: alphaUserId,
      fullName: 'Alpha Traveler',
      collegeId: 'kiet-1',
      academicYear: 3,
      gender: 'male',
      trustScore: 20,
      averageRating: 5.0,
      completedTripCount: 0,
      connectionCount: 0,
      verificationStatus: 'unverified',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Student Beta
    const betaUser = await usersRepository.createUser({
      email: 'beta.e2e@kiet.edu',
      emailNormalized: 'beta.e2e@kiet.edu',
      passwordHash: hashedPass,
      role: 'student',
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
    betaUserId = betaUser._id.toHexString();
    betaToken = generateAccessToken({
      userId: betaUserId,
      email: 'beta.e2e@kiet.edu',
      role: 'student',
      status: 'active',
    });
    await usersRepository.createProfile({
      userId: betaUserId,
      fullName: 'Beta Companion',
      collegeId: 'kiet-1',
      academicYear: 2,
      gender: 'female',
      trustScore: 30,
      averageRating: 5.0,
      completedTripCount: 1,
      connectionCount: 1,
      verificationStatus: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  // ------------------------------------------------------------------------
  // Journey 1: Onboarding, Identity & Verification Lifecycle
  // ------------------------------------------------------------------------
  describe('Journey 1: Student Onboarding, Identity & Verification Lifecycle', () => {
    it('should allow Student Alpha to complete onboarding profile and submit college ID card', async () => {
      // Update onboarding profile
      const profRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/me',
        headers: { authorization: `Bearer ${alphaToken}` },
        payload: {
          academicYear: 3,
          gender: 'male',
          bio: 'Daily campus traveler on NH-58 route.',
        },
      });
      expect(profRes.statusCode).toBe(200);
      expect(JSON.parse(profRes.body).data.profile.academicYear).toBe(3);

      // Submit verification with base64 document
      const verifRes = await app.inject({
        method: 'POST',
        url: '/api/v1/verification',
        headers: { authorization: `Bearer ${alphaToken}` },
        payload: {
          documentBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          mimeType: 'image/jpeg',
          filename: 'alpha-student-id.jpg',
        },
      });
      expect(verifRes.statusCode).toBe(201);
      alphaVerificationReqId = JSON.parse(verifRes.body).data.id;
    });

    it('should allow Moderator to review pending ID and approve it (+30 trust points granted)', async () => {
      const approveRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/verifications/${alphaVerificationReqId}`,
        headers: { authorization: `Bearer ${moderatorToken}` },
        payload: {
          status: 'approved',
        },
      });
      expect(approveRes.statusCode).toBe(200);

      // Check updated profile trust score
      const alphaProfileRes = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${alphaUserId}`,
        headers: { authorization: `Bearer ${alphaToken}` },
      });
      expect(alphaProfileRes.statusCode).toBe(200);
      const alphaProfile = JSON.parse(alphaProfileRes.body).data;
      expect(alphaProfile.verificationStatus).toBe('approved');
      expect(alphaProfile.trustScore).toBeGreaterThanOrEqual(50); // initial 20 + 30 approved = 50
    });
  });

  // ------------------------------------------------------------------------
  // Journey 2: Route Publishing, 6-Factor Matching & Connection Handshake
  // ------------------------------------------------------------------------
  describe('Journey 2: Route Publishing, Smart Matching & Connection Handshake', () => {
    it('should publish compatible trips for Alpha and Beta', async () => {
      // Alpha publishes trip from KIET to Anand Vihar
      const resA = await app.inject({
        method: 'POST',
        url: '/api/v1/trips',
        headers: { authorization: `Bearer ${alphaToken}` },
        payload: {
          source: {
            name: 'KIET Campus, Ghaziabad',
            coordinates: { type: 'Point', coordinates: [77.498, 28.752] },
          },
          destination: {
            name: 'Anand Vihar ISBT, Delhi',
            coordinates: { type: 'Point', coordinates: [77.315, 28.650] },
          },
          travelDate,
          departureTime: '08:30',
          transportType: 'train',
          availableSeats: 3,
          costSharing: { enabled: true, estimatedTotalCost: 300, currency: 'INR' },
        },
      });
      expect(resA.statusCode).toBe(201);
      alphaTripId = JSON.parse(resA.body).data.id;

      // Beta publishes trip from Muradnagar to Anand Vihar on same date & time
      const resB = await app.inject({
        method: 'POST',
        url: '/api/v1/trips',
        headers: { authorization: `Bearer ${betaToken}` },
        payload: {
          source: {
            name: 'Muradnagar Station',
            coordinates: { type: 'Point', coordinates: [77.502, 28.775] },
          },
          destination: {
            name: 'Anand Vihar ISBT, Delhi',
            coordinates: { type: 'Point', coordinates: [77.315, 28.650] },
          },
          travelDate,
          departureTime: '08:35',
          transportType: 'train',
          availableSeats: 2,
        },
      });
      expect(resB.statusCode).toBe(201);
      betaTripId = JSON.parse(resB.body).data.id;
    });

    it('should discover 6-factor compatibility matches and send connection request', async () => {
      // Trigger match generation
      await app.inject({
        method: 'POST',
        url: `/api/v1/matches/generate/${alphaTripId}`,
        headers: { authorization: `Bearer ${alphaToken}` },
      });

      const matchRes = await app.inject({
        method: 'GET',
        url: `/api/v1/matches?tripId=${alphaTripId}`,
        headers: { authorization: `Bearer ${alphaToken}` },
      });
      expect(matchRes.statusCode).toBe(200);
      const matchItems = JSON.parse(matchRes.body).data;
      expect(matchItems.length).toBeGreaterThan(0);
      expect(matchItems[0].score).toBeGreaterThanOrEqual(60);

      // Alpha sends connection request to Beta
      const connRes = await app.inject({
        method: 'POST',
        url: '/api/v1/connections',
        headers: { authorization: `Bearer ${alphaToken}` },
        payload: {
          recipientId: betaUserId,
          tripId: alphaTripId,
          message: 'Hey! Same train towards Anand Vihar. Let us travel together.',
        },
      });
      expect(connRes.statusCode).toBe(201);
      connectionId = JSON.parse(connRes.body).data.id;
    });

    it('should allow Beta to view incoming requests and accept companion handshake', async () => {
      const reqListRes = await app.inject({
        method: 'GET',
        url: '/api/v1/connections?type=incoming',
        headers: { authorization: `Bearer ${betaToken}` },
      });
      expect(reqListRes.statusCode).toBe(200);
      const incomingList = JSON.parse(reqListRes.body).data;
      expect(incomingList.some((c: any) => c.id === connectionId)).toBe(true);

      // Beta accepts connection
      const acceptRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/connections/${connectionId}`,
        headers: { authorization: `Bearer ${betaToken}` },
        payload: { status: 'accepted' },
      });
      expect(acceptRes.statusCode).toBe(200);
      const acceptData = JSON.parse(acceptRes.body).data;
      expect(acceptData.status).toBe('accepted');
      conversationId = acceptData.conversationId;
    });
  });

  // ------------------------------------------------------------------------
  // Journey 3: Messaging & Travel Group Coordination
  // ------------------------------------------------------------------------
  describe('Journey 3: Realtime Messaging & Travel Group Formation', () => {
    it('should exchange messages between connected travel companions', async () => {
      // Alpha sends message in the established conversation
      const sendMsgRes = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${conversationId}/messages`,
        headers: { authorization: `Bearer ${alphaToken}` },
        payload: {
          body: 'Meeting near Coach D2 at 8:25 AM.',
        },
      });
      expect(sendMsgRes.statusCode).toBe(201);

      // Beta reads message list
      const fetchMsgs = await app.inject({
        method: 'GET',
        url: `/api/v1/conversations/${conversationId}/messages`,
        headers: { authorization: `Bearer ${betaToken}` },
      });
      expect(fetchMsgs.statusCode).toBe(200);
      const msgs = JSON.parse(fetchMsgs.body).data;
      expect(msgs.some((m: any) => m.body === 'Meeting near Coach D2 at 8:25 AM.')).toBe(true);
    });

    it('should create a travel group and dynamically split costs upon joining', async () => {
      // Alpha creates group for 4 seats with total cost 300 INR
      const grpRes = await app.inject({
        method: 'POST',
        url: '/api/v1/groups',
        headers: { authorization: `Bearer ${alphaToken}` },
        payload: {
          tripId: alphaTripId,
          name: 'KIET Morning Train Pool',
          description: 'Daily commuter buddy group',
          maxCapacity: 4,
          costSharing: {
            enabled: true,
            estimatedTotalCost: 300,
            currency: 'INR',
          },
        },
      });
      expect(grpRes.statusCode).toBe(201);
      groupId = JSON.parse(grpRes.body).data.id;

      // Beta joins group
      const joinRes = await app.inject({
        method: 'POST',
        url: `/api/v1/groups/${groupId}/join`,
        headers: { authorization: `Bearer ${betaToken}` },
      });
      expect(joinRes.statusCode).toBe(200);

      // Inspect updated roster & cost split calculation
      const inspectRes = await app.inject({
        method: 'GET',
        url: `/api/v1/groups/${groupId}`,
        headers: { authorization: `Bearer ${alphaToken}` },
      });
      expect(inspectRes.statusCode).toBe(200);
      const groupData = JSON.parse(inspectRes.body).data;
      expect(groupData.currentMemberCount).toBe(2);
      expect(groupData.costSharing.perPersonCost).toBe(150); // 300 / 2 members = 150 INR each
    });
  });

  // ------------------------------------------------------------------------
  // Journey 4: Safety Center, Emergency SOS & Incident Moderation
  // ------------------------------------------------------------------------
  describe('Journey 4: Safety Center, Emergency SOS & Incident Moderation', () => {
    let sosEventId: string;

    it('should register emergency contact and trigger emergency SOS with GPS coordinates', async () => {
      // Register Mother as primary emergency contact
      const contactRes = await app.inject({
        method: 'POST',
        url: '/api/v1/safety/emergency-contacts',
        headers: { authorization: `Bearer ${alphaToken}` },
        payload: {
          name: 'Sunita Sharma',
          phone: '9876543211',
          relationship: 'Parent',
          isPrimary: true,
        },
      });
      expect(contactRes.statusCode).toBe(201);

      // Trigger SOS
      const sosRes = await app.inject({
        method: 'POST',
        url: '/api/v1/safety/sos',
        headers: { authorization: `Bearer ${alphaToken}` },
        payload: {
          location: { type: 'Point', coordinates: [77.498, 28.752] },
        },
      });
      expect(sosRes.statusCode).toBe(201);
      sosEventId = JSON.parse(sosRes.body).data.id;
      expect(JSON.parse(sosRes.body).data.status).toBe('active');
    });

    it('should allow Moderator to inspect active SOS and resolve alert', async () => {
      const sosListRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/sos-events?status=active',
        headers: { authorization: `Bearer ${moderatorToken}` },
      });
      expect(sosListRes.statusCode).toBe(200);
      expect(JSON.parse(sosListRes.body).data.some((e: any) => e.id === sosEventId)).toBe(true);

      // Resolve SOS
      const resolveRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/sos-events/${sosEventId}`,
        headers: { authorization: `Bearer ${moderatorToken}` },
        payload: {
          status: 'resolved',
          resolutionNotes: 'Contacted student, confirmed reached campus safely.',
        },
      });
      expect(resolveRes.statusCode).toBe(200);
      expect(JSON.parse(resolveRes.body).data.status).toBe('resolved');
    });
  });

  // ------------------------------------------------------------------------
  // Journey 5: Trip Completion, Verified Review & Trust Score Elevation
  // ------------------------------------------------------------------------
  describe('Journey 5: Trip Completion, Verified Review & Trust Elevation', () => {
    it('should mark trip completed and allow Beta to submit a verified 5-star review for Alpha', async () => {
      // Mark trip completed
      const updateTripRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/trips/${alphaTripId}`,
        headers: { authorization: `Bearer ${alphaToken}` },
        payload: { status: 'completed' },
      });
      expect(updateTripRes.statusCode).toBe(200);

      // Beta reviews Alpha
      const revRes = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews',
        headers: { authorization: `Bearer ${betaToken}` },
        payload: {
          reviewedUserId: alphaUserId,
          tripId: alphaTripId,
          rating: 5,
          punctualityRating: 5,
          communicationRating: 5,
          cleanlinessRating: 5,
          comment: 'Fantastic travel partner! Extremely punctual and respectful.',
          tags: ['punctual', 'verified_student', 'great_music'],
        },
      });
      expect(revRes.statusCode).toBe(201);
    });

    it('should reflect updated review statistics and elevated reputation score on Alpha profile', async () => {
      const pubProfileRes = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${alphaUserId}`,
        headers: { authorization: `Bearer ${alphaToken}` },
      });
      expect(pubProfileRes.statusCode).toBe(200);
      const profile = JSON.parse(pubProfileRes.body).data;

      expect(profile.averageRating).toBe(5.0);
      expect(profile.trustScore).toBeGreaterThanOrEqual(55); // Elevated trust score after review and completed trip
    });
  });
});
