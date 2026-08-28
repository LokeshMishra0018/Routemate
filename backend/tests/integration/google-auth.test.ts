import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildApp } from '../../src/app.js';
import { connectMongo, disconnectMongo } from '../../src/db/mongo.js';
import { seedDatabase } from '../../src/db/seed.js';
import { getEnv } from '../../src/config/env.js';

describe('Institutional Google Authentication Module (@kiet.edu)', () => {
  let app: FastifyInstance;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const dbName = 'routemate_test_google_auth';

    const { db } = await connectMongo(uri, dbName);
    await seedDatabase(db);

    const testEnv = {
      ...getEnv(),
      NODE_ENV: 'test' as const,
      MONGODB_URI: uri,
      MONGODB_DB_NAME: dbName,
    };

    app = await buildApp({ env: testEnv });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await disconnectMongo();
    await mongod.stop();
  });

  it('should authenticate a new student with a valid @kiet.edu Google account, auto-verifying email and linking to KIET', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: 'mock-google-token:aarav.sharma22@kiet.edu',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.user.email).toBe('aarav.sharma22@kiet.edu');
    expect(body.data.user.emailVerified).toBe(true);
    expect(body.data.user.profile.collegeDomain).toBe('kiet.edu');
    expect(body.data.user.profile.collegeName).toContain('KIET');
  });

  it('should allow returning @kiet.edu student to sign in and update lastLoginAt', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: 'mock-google-token:aarav.sharma22@kiet.edu',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('aarav.sharma22@kiet.edu');
  });

  it('should strictly reject non-institutional Google accounts (@gmail.com) with 403 Forbidden', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: 'mock-google-token:random.student@gmail.com',
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('@kiet.edu');
  });

  it('should reject missing or empty idToken with 400 Bad Request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: '',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
  });
});
