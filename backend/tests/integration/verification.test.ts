import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';

describe('College Verification Module (Integration)', () => {
  let app: FastifyInstance;
  let studentToken: string;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_verification',
    });
    app = await buildApp({ env });
    await app.ready();

    // Register student
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'aman.verma@kiet.edu',
        password: 'Password123!',
        fullName: 'Aman Verma',
      },
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'aman.verma@kiet.edu',
        password: 'Password123!',
      },
    });
    studentToken = JSON.parse(loginRes.body).data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('GET /api/v1/verification/me should return null when no request submitted yet', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/verification/me',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeNull();
  });

  it('POST /api/v1/verification should submit college ID document and transition status to pending', async () => {
    const sampleDocumentBase64 = Buffer.from('FAKE_COLLEGE_ID_IMAGE_BINARY').toString('base64');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verification',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        documentBase64: sampleDocumentBase64,
        mimeType: 'image/jpeg',
        filename: 'college_id.jpg',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('pending');
    expect(body.data.documentMimeType).toBe('image/jpeg');

    // Verify /me profile now reflects pending verification status
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });
    const meBody = JSON.parse(meRes.body);
    expect(meBody.data.profile.verificationStatus).toBe('pending');
  });

  it('GET /api/v1/verification/me should now return the pending verification request', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/verification/me',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('pending');
  });
});
