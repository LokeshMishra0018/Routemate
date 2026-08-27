import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { safetyService } from '../../src/modules/safety/safety.service.js';

import { generateAccessToken } from '../../src/lib/jwt.js';
import { usersRepository } from '../../src/modules/users/users.repository.js';
import { hashPassword } from '../../src/lib/crypto.js';

describe('Admin Safety & Moderation Expansion (Integration)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let offenderUserId: string;
  let reporterUserId: string;
  let reportId: string;
  let sosId: string;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_admin_safety',
    });
    app = await buildApp({ env });
    await app.ready();

    // 1. Create and authenticate Admin user
    const adminPass = await hashPassword('AdminPass123!');
    const adminUser = await usersRepository.createUser({
      email: 'admin.safety@routemate.app',
      emailNormalized: 'admin.safety@routemate.app',
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
      userId: adminUser._id.toHexString(),
      email: 'admin.safety@routemate.app',
      role: 'admin',
      status: 'active',
    });

    // 2. Offender student
    const offReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'offender@kiet.edu', password: 'Password123!', fullName: 'Offender User' },
    });
    offenderUserId = JSON.parse(offReg.body).data.userId;

    // 3. Reporter student
    const repReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'reporter@kiet.edu', password: 'Password123!', fullName: 'Reporter User' },
    });
    reporterUserId = JSON.parse(repReg.body).data.userId;

    // File report
    const rep = await safetyService.fileReport({
      reporterId: reporterUserId,
      reportedUserId: offenderUserId,
      category: 'harassment',
      reason: 'Offender continuously harassed participants during ride.',
    });
    reportId = rep.id;

    // Trigger SOS
    const sos = await safetyService.triggerSos({
      userId: offenderUserId,
      location: { type: 'Point', coordinates: [77.4304, 28.6692] },
    });
    sosId = sos.id;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('GET /api/v1/admin/reports: should list safety reports with filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reports?status=pending',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(reportId);
    expect(body.data[0].category).toBe('harassment');
  });

  it('PATCH /api/v1/admin/reports/:id: should resolve report and suspend offender', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/reports/${reportId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        status: 'resolved',
        resolutionNotes: 'Violations verified. Suspending offender user.',
        actionUser: 'suspend',
      },
    });

    expect(res.statusCode).toBe(200);

    // Verify user status is now suspended
    const historyRes = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/users/${offenderUserId}/safety-history`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(historyRes.statusCode).toBe(200);
    const history = JSON.parse(historyRes.body).data;
    expect(history.status).toBe('suspended');
    expect(history.reportsAgainstCount).toBe(1);
  });

  it('GET /api/v1/admin/sos-events & PATCH /api/v1/admin/sos-events/:id: should inspect and resolve SOS event', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sos-events?status=active',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    expect(JSON.parse(listRes.body).data.length).toBe(1);

    const resolveRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/sos-events/${sosId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        status: 'resolved',
        resolutionNotes: 'Campus security contacted and assisted commuter.',
      },
    });

    expect(resolveRes.statusCode).toBe(200);
    expect(JSON.parse(resolveRes.body).data.status).toBe('resolved');
  });
});
