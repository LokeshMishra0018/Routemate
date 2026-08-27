import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { authenticate, requireVerified } from '../../src/middleware/auth.js';
import { createSuccessResponse } from '../../src/utils/response.js';

describe('Phase 2 Security & Edge Cases (Integration)', () => {
  let app: FastifyInstance;
  let unverifiedToken: string;
  let verifiedToken: string;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_edge_cases',
    });
    app = await buildApp({ env });

    // Register a temporary test route protected by requireVerified
    app.get(
      '/api/v1/test-verified-only',
      {
        preHandler: [authenticate, requireVerified],
      },
      async (_req, reply) => {
        return reply.status(200).send(createSuccessResponse({ access: 'granted' }));
      }
    );

    await app.ready();

    // 1. Create an unverified student
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'unverified.user@kiet.edu',
        password: 'Password123!',
        fullName: 'Unverified User',
      },
    });
    const unverifiedLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'unverified.user@kiet.edu',
        password: 'Password123!',
      },
    });
    unverifiedToken = JSON.parse(unverifiedLogin.body).data.accessToken;

    // 2. Create a verified student
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'verified.user@kiet.edu',
        password: 'Password123!',
        fullName: 'Verified User',
      },
    });
    const verifiedLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'verified.user@kiet.edu',
        password: 'Password123!',
      },
    });
    verifiedToken = JSON.parse(verifiedLogin.body).data.accessToken;

    // Submit and approve verification for verified user
    const verifRes = await app.inject({
      method: 'POST',
      url: '/api/v1/verification',
      headers: { authorization: `Bearer ${verifiedToken}` },
      payload: {
        documentBase64: Buffer.from('TEST_DOC').toString('base64'),
        mimeType: 'image/png',
        filename: 'test.png',
      },
    });
    const verifId = JSON.parse(verifRes.body).data.id;

    // Create admin to approve
    const { usersRepository } = await import('../../src/modules/users/users.repository.js');
    const { hashPassword } = await import('../../src/lib/crypto.js');
    const { generateAccessToken } = await import('../../src/lib/jwt.js');

    const admin = await usersRepository.createUser({
      email: 'superadmin@routemate.app',
      emailNormalized: 'superadmin@routemate.app',
      passwordHash: await hashPassword('AdminPass123!'),
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
    const adminToken = generateAccessToken({
      userId: admin._id.toHexString(),
      email: admin.email,
      role: 'admin',
      status: 'active',
    });

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/verifications/${verifId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'approved' },
    });
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('requireVerified should block unverified student with 403 FORBIDDEN', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/test-verified-only',
      headers: { authorization: `Bearer ${unverifiedToken}` },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('Approved college verification required');
  });

  it('requireVerified should allow verified student access', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/test-verified-only',
      headers: { authorization: `Bearer ${verifiedToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.access).toBe('granted');
  });

  it('should reject password reset when token is invalid or expired', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: {
        token: 'completely-invalid-nonexistent-token',
        password: 'NewStrongPassword123!',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('Invalid or expired password reset token');
  });

  it('should reject verification submission if document exceeds format rules', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verification',
      headers: { authorization: `Bearer ${unverifiedToken}` },
      payload: {
        documentBase64: Buffer.from('FAKE_EXE').toString('base64'),
        mimeType: 'application/x-msdownload',
        filename: 'malicious.exe',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.message).toContain('Invalid document format');
  });

  it('should reject invalid password during registration (missing number or too short)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'bad.password@kiet.edu',
        password: 'onlyletters',
        fullName: 'Bad Password',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
