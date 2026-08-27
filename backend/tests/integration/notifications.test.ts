import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { notificationsService } from '../../src/modules/notifications/notifications.service.js';

describe('Notifications Module (Integration)', () => {
  let app: FastifyInstance;
  let userToken: string;
  let userId: string;
  let notifId: string;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_notifs',
    });
    app = await buildApp({ env });
    await app.ready();

    const reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'notif.user@kiet.edu', password: 'Password123!', fullName: 'Notif User' },
    });
    userId = JSON.parse(reg.body).data.userId;
    const log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'notif.user@kiet.edu', password: 'Password123!' },
    });
    userToken = JSON.parse(log.body).data.accessToken;

    // Seed 3 notifications
    const n1 = await notificationsService.createNotification({
      userId,
      type: 'new_match',
      title: 'New Trip Match Found',
      body: 'A student matching 95% of your route to Lucknow was discovered.',
    });
    notifId = n1.id;

    await notificationsService.createNotification({
      userId,
      type: 'connection_request',
      title: 'New Connection Request',
      body: 'A student wants to join your trip.',
    });

    await notificationsService.createNotification({
      userId,
      type: 'trip_reminder',
      title: 'Trip Upcoming',
      body: 'Your trip departs in 24 hours.',
    });
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('GET /api/v1/notifications: should list all notifications with unreadCount = 3', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(3);
    expect(body.unreadCount).toBe(3);
  });

  it('PATCH /api/v1/notifications/:id/read: should mark single notification as read and decrement unreadCount', async () => {
    const readRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/notifications/${notifId}/read`,
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(readRes.statusCode).toBe(200);
    expect(JSON.parse(readRes.body).data.isRead).toBe(true);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(JSON.parse(listRes.body).unreadCount).toBe(2);
  });

  it('POST /api/v1/notifications/read-all: should mark all notifications as read', async () => {
    const readAllRes = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/read-all',
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(readAllRes.statusCode).toBe(200);
    expect(JSON.parse(readAllRes.body).data.markedCount).toBe(2);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(JSON.parse(listRes.body).unreadCount).toBe(0);
  });
});
