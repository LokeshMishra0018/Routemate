import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { DevEmailProvider } from '../../src/lib/email/email.interface.js';

describe('Authentication & Sessions Flow (Integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_auth',
    });
    app = await buildApp({ env });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('should reject registration with non-institutional email domain', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'student@gmail.com',
        password: 'Password123!',
        fullName: 'Test Student',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('not an active institutional partner');
  });

  it('should register student with @kiet.edu institutional email and send verification token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'rahul.sharma@kiet.edu',
        password: 'SecurePassword123!',
        fullName: 'Rahul Sharma',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('rahul.sharma@kiet.edu');
    expect(body.data.requiresEmailVerification).toBe(true);

    // Verify verification email was triggered
    const emailRecord = DevEmailProvider.lastSentEmails.find(
      (e) => e.to === 'rahul.sharma@kiet.edu' && e.type === 'VERIFICATION'
    );
    expect(emailRecord).toBeDefined();
    expect(emailRecord?.token).toBeDefined();
  });

  it('should reject duplicate email registration with 409 Conflict', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'rahul.sharma@kiet.edu',
        password: 'AnotherPassword123!',
        fullName: 'Rahul Duplicate',
      },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('should verify email address with valid token', async () => {
    const emailRecord = DevEmailProvider.lastSentEmails.find(
      (e) => e.to === 'rahul.sharma@kiet.edu' && e.type === 'VERIFICATION'
    );
    const token = emailRecord!.token!;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: { token },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('verified successfully');
  });

  it('should reject login with invalid password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'rahul.sharma@kiet.edu',
        password: 'IncorrectPassword999!',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should log in with valid credentials and return access + refresh tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'rahul.sharma@kiet.edu',
        password: 'SecurePassword123!',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
    expect(body.data.user.email).toBe('rahul.sharma@kiet.edu');
    expect(body.data.user.emailVerified).toBe(true);
    expect(body.data.user.profile.collegeDomain).toBe('kiet.edu');
  });

  it('should refresh tokens with rotation and prevent token reuse', async () => {
    // 1. Log in to get initial refresh token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'rahul.sharma@kiet.edu',
        password: 'SecurePassword123!',
      },
    });
    const initialRefreshToken = JSON.parse(loginRes.body).data.refreshToken;

    // 2. Consume refresh token -> returns new tokens
    const refreshRes1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: initialRefreshToken },
    });

    expect(refreshRes1.statusCode).toBe(200);
    const newRefreshToken = JSON.parse(refreshRes1.body).data.refreshToken;
    expect(newRefreshToken).not.toBe(initialRefreshToken);

    // 3. Attempt to reuse the consumed initial refresh token -> must fail with 401
    const reuseRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: initialRefreshToken },
    });

    expect(reuseRes.statusCode).toBe(401);
  });

  it('should log out and revoke the active session', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'rahul.sharma@kiet.edu',
        password: 'SecurePassword123!',
      },
    });
    const refreshToken = JSON.parse(loginRes.body).data.refreshToken;

    // Log out
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken },
    });
    expect(logoutRes.statusCode).toBe(200);

    // Refresh token should now be rejected
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(401);
  });

  it('should handle forgot-password and reset-password flow', async () => {
    // 1. Forgot password request
    const forgotRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'rahul.sharma@kiet.edu' },
    });
    expect(forgotRes.statusCode).toBe(200);

    const resetEmail = DevEmailProvider.lastSentEmails.find(
      (e) => e.to === 'rahul.sharma@kiet.edu' && e.type === 'PASSWORD_RESET'
    );
    expect(resetEmail?.token).toBeDefined();

    // 2. Reset password
    const resetRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: {
        token: resetEmail!.token!,
        password: 'NewStrongPassword456!',
      },
    });
    expect(resetRes.statusCode).toBe(200);

    // 3. Log in with new password
    const loginNewRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'rahul.sharma@kiet.edu',
        password: 'NewStrongPassword456!',
      },
    });
    expect(loginNewRes.statusCode).toBe(200);
  });
});
