import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { usersRepository } from '../../src/modules/users/users.repository.js';
import { hashPassword } from '../../src/lib/crypto.js';
import { generateAccessToken } from '../../src/lib/jwt.js';

describe('Admin & Moderation Module (Integration)', () => {
  let app: FastifyInstance;
  let studentToken: string;
  let adminToken: string;
  let moderatorToken: string;
  let targetStudentId: string;
  let verificationId: string;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_admin',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. Create a student user
    const studentPass = await hashPassword('Password123!');
    const student = await usersRepository.createUser({
      email: 'student.target@kiet.edu',
      emailNormalized: 'student.target@kiet.edu',
      passwordHash: studentPass,
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
    targetStudentId = student._id.toHexString();
    await usersRepository.createProfile({
      userId: targetStudentId,
      fullName: 'Target Student',
      collegeId: '60d5ec49f1b24b2b8c8b0001',
      academicYear: 2,
      gender: 'male',
      bio: 'Ready to travel',
      avatarUrl: null,
      verificationStatus: 'pending',
      trustScore: 50,
      averageRating: 5.0,
      completedTripCount: 0,
      connectionCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    studentToken = generateAccessToken({
      userId: targetStudentId,
      email: student.email,
      role: 'student',
      status: 'active',
    });

    // Submit verification for target student
    const verifRes = await app.inject({
      method: 'POST',
      url: '/api/v1/verification',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        documentBase64: Buffer.from('FAKE_ID').toString('base64'),
        mimeType: 'image/png',
        filename: 'id.png',
      },
    });
    verificationId = JSON.parse(verifRes.body).data.id;

    // 2. Create Moderator user
    const modPass = await hashPassword('ModPassword123!');
    const moderator = await usersRepository.createUser({
      email: 'moderator@routemate.app',
      emailNormalized: 'moderator@routemate.app',
      passwordHash: modPass,
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
      userId: moderator._id.toHexString(),
      email: moderator.email,
      role: 'moderator',
      status: 'active',
    });

    // 3. Create Admin user
    const adminPass = await hashPassword('AdminPassword123!');
    const admin = await usersRepository.createUser({
      email: 'admin@routemate.app',
      emailNormalized: 'admin@routemate.app',
      passwordHash: adminPass,
      role: 'admin',
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
    adminToken = generateAccessToken({
      userId: admin._id.toHexString(),
      email: admin.email,
      role: 'admin',
      status: 'active',
    });
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('should block student from accessing admin endpoints with 403 Forbidden', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/verifications',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('should allow moderator to view pending verification queue', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/verifications',
      headers: { authorization: `Bearer ${moderatorToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('should allow moderator to approve verification request, updating profile trust score and logging audit action', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/verifications/${verificationId}`,
      headers: { authorization: `Bearer ${moderatorToken}` },
      payload: { status: 'approved' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('approved');

    // Verify student profile status was updated to approved and trust score boosted
    const profile = await usersRepository.findProfileByUserId(targetStudentId);
    expect(profile?.verificationStatus).toBe('approved');
    expect(profile?.trustScore).toBe(80);
  });

  it('should allow admin to list users and search', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users?search=target',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].email).toContain('student.target');
  });

  it('should allow admin to suspend and unsuspend a user account', async () => {
    // 1. Suspend
    const suspendRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${targetStudentId}/suspend`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { reason: 'Violation of travel safety policy' },
    });
    expect(suspendRes.statusCode).toBe(200);

    // 2. Suspended student should be forbidden from accessing /me
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(meRes.statusCode).toBe(403);
    expect(JSON.parse(meRes.body).error.message).toContain('Account is suspended');

    // 3. Unsuspend
    const unsuspendRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${targetStudentId}/unsuspend`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(unsuspendRes.statusCode).toBe(200);

    // 4. Student can access /me again
    const meRes2 = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(meRes2.statusCode).toBe(200);
  });

  it('should allow admin to view immutable audit logs', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit-logs',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const actionTypes = body.data.map((l: { actionType: string }) => l.actionType);
    expect(actionTypes).toContain('verification_approved');
    expect(actionTypes).toContain('user_suspended');
    expect(actionTypes).toContain('user_unsuspended');
  });
});
