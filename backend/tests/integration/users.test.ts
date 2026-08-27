import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';

describe('Users & Profiles (Integration)', () => {
  let app: FastifyInstance;
  let studentToken: string;
  let studentId: string;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_users',
    });
    app = await buildApp({ env });
    await app.ready();

    // Register & login student
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'priya.singh@kiet.edu',
        password: 'Password123!',
        fullName: 'Priya Singh',
      },
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'priya.singh@kiet.edu',
        password: 'Password123!',
      },
    });
    const loginData = JSON.parse(loginRes.body).data;
    studentToken = loginData.accessToken;
    studentId = loginData.user.id;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('GET /api/v1/me should reject unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
    });
    expect(response.statusCode).toBe(401);
  });

  it('GET /api/v1/me should return current user and profile data with token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('priya.singh@kiet.edu');
    expect(body.data.profile.fullName).toBe('Priya Singh');
    expect(body.data.profile.collegeDomain).toBe('kiet.edu');
    expect(body.data.profile.verificationStatus).toBe('unverified');
    expect(body.data.profile.trustScore).toBe(50);
  });

  it('PATCH /api/v1/me should update allowed profile fields', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        bio: 'Computer Science 3rd year student travelling often.',
        academicYear: 3,
        gender: 'female',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.profile.bio).toBe('Computer Science 3rd year student travelling often.');
    expect(body.data.profile.academicYear).toBe(3);
    expect(body.data.profile.gender).toBe('female');
  });

  it('PATCH /api/v1/me should ignore unauthorized attempts to elevate role or trustScore', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        role: 'admin',
        trustScore: 100,
        verificationStatus: 'approved',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    // Profile updates must ignore role, trustScore, verificationStatus
    expect(body.data.role).toBe('student');
    expect(body.data.profile.trustScore).toBe(50);
    expect(body.data.profile.verificationStatus).toBe('unverified');
  });

  it('GET /api/v1/users/:id should return public profile DTO without sensitive data', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${studentId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(studentId);
    expect(body.data.fullName).toBe('Priya Singh');
    expect(body.data.academicYear).toBe(3);
    // Sensitive fields must NOT be in public profile
    expect(body.data.email).toBeUndefined();
    expect(body.data.passwordHash).toBeUndefined();
  });
});
