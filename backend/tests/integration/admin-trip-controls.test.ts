import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { AdminService } from '../../src/modules/admin/admin.service.js';
import { getDb } from '../../src/db/mongo.js';
import { COLLECTIONS } from '../../src/db/collections.js';
import { ObjectId } from 'mongodb';

describe('Admin Trip Controls & Memory Cleanup (Integration Tests)', () => {
  let app: FastifyInstance;
  let adminService: AdminService;

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_admin_trips',
    });
    app = await buildApp({ env });
    await app.ready();
    adminService = new AdminService();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  it('should permanently purge trip document and clean up associated join requests', async () => {
    const db = getDb();
    const mockTripId = new ObjectId();
    const mockUserId = 'user_student_123';

    // Insert mock trip
    await db.collection(COLLECTIONS.TRIPS).insertOne({
      _id: mockTripId,
      userId: mockUserId,
      source: { name: 'KIET Gate 1' },
      destination: { name: 'Ghaziabad Junction' },
      status: 'planning',
      createdAt: new Date(),
    } as any);

    // Insert mock associated connection/join requests
    await db.collection(COLLECTIONS.CONNECTIONS).insertOne({
      _id: new ObjectId(),
      tripId: mockTripId.toHexString(),
      requesterId: 'passenger_1',
      status: 'pending',
      createdAt: new Date(),
    } as any);

    // Verify presence before purge
    const beforeTrip = await db.collection(COLLECTIONS.TRIPS).findOne({ _id: mockTripId });
    const beforeConns = await db.collection(COLLECTIONS.CONNECTIONS).find({ tripId: mockTripId.toHexString() }).toArray();
    expect(beforeTrip).toBeDefined();
    expect(beforeConns.length).toBe(1);

    // Execute hard delete & purge
    const res = await adminService.deleteTripByAdmin('admin_super', mockTripId.toHexString());
    expect(res.success).toBe(true);

    // Verify permanent cleanup from database (zero memory waste)
    const afterTrip = await db.collection(COLLECTIONS.TRIPS).findOne({ _id: mockTripId });
    const afterConns = await db.collection(COLLECTIONS.CONNECTIONS).find({ tripId: mockTripId.toHexString() }).toArray();
    expect(afterTrip).toBeNull();
    expect(afterConns.length).toBe(0);
  });

  it('should toggle trip visibility to hide from search results', async () => {
    const db = getDb();
    const mockTripId = new ObjectId();

    await db.collection(COLLECTIONS.TRIPS).insertOne({
      _id: mockTripId,
      userId: 'user_student_456',
      source: { name: 'KIET Gate 2' },
      destination: { name: 'Noida City Center' },
      status: 'planning',
      isHidden: false,
      createdAt: new Date(),
    } as any);

    // Hide trip
    const hideRes = await adminService.toggleTripVisibility('admin_super', mockTripId.toHexString(), true);
    expect(hideRes.success).toBe(true);
    expect(hideRes.isHidden).toBe(true);

    const hiddenTrip = await db.collection(COLLECTIONS.TRIPS).findOne({ _id: mockTripId });
    expect(hiddenTrip?.isHidden).toBe(true);

    // Unhide trip
    const unhideRes = await adminService.toggleTripVisibility('admin_super', mockTripId.toHexString(), false);
    expect(unhideRes.success).toBe(true);
    expect(unhideRes.isHidden).toBe(false);

    const visibleTrip = await db.collection(COLLECTIONS.TRIPS).findOne({ _id: mockTripId });
    expect(visibleTrip?.isHidden).toBe(false);

    // Cleanup
    await db.collection(COLLECTIONS.TRIPS).deleteOne({ _id: mockTripId });
  });
});
