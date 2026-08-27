import { Db } from 'mongodb';
import { COLLECTIONS } from './collections.js';
import { ensureIndexes } from './indexes.js';
import { hashPassword } from '../lib/crypto.js';

export interface SeedResult {
  indexesCreated: number;
  collegesSeeded: number;
  usersSeeded: number;
  message: string;
}

/**
 * Seed initial baseline data required by RouteMate (such as KIET college and demo accounts).
 * Idempotent: safe to run multiple times without duplicating data.
 */
export async function seedDatabase(db: Db): Promise<SeedResult> {
  // 1. Ensure indexes first
  const indexResult = await ensureIndexes(db);

  // 2. Seed KIET College if not already present
  const collegesCollection = db.collection(COLLECTIONS.COLLEGES);
  let kiet = await collegesCollection.findOne({ domain: 'kiet.edu' });

  let collegesSeeded = 0;
  const now = new Date();

  if (!kiet) {
    const result = await collegesCollection.insertOne({
      name: 'KIET Group of Institutions',
      domain: 'kiet.edu',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    kiet = { _id: result.insertedId, name: 'KIET Group of Institutions', domain: 'kiet.edu', isActive: true, createdAt: now, updatedAt: now };
    collegesSeeded += 1;
  }

  const collegeId = kiet._id.toHexString();
  const usersCollection = db.collection(COLLECTIONS.USERS);
  const profilesCollection = db.collection(COLLECTIONS.PROFILES);
  let usersSeeded = 0;

  // 3. Seed Demo Student Account (student@kiet.edu / Password123)
  const demoStudentEmail = 'student@kiet.edu';
  const existingStudent = await usersCollection.findOne({ emailNormalized: demoStudentEmail });
  if (!existingStudent) {
    const studentPasswordHash = await hashPassword('Password123');
    const userResult = await usersCollection.insertOne({
      email: demoStudentEmail,
      emailNormalized: demoStudentEmail,
      passwordHash: studentPasswordHash,
      role: 'student',
      status: 'active',
      emailVerifiedAt: now,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await profilesCollection.insertOne({
      userId: userResult.insertedId.toHexString(),
      fullName: 'Demo Student',
      collegeId,
      academicYear: 3,
      gender: 'other',
      bio: 'Daily campus commuter and RouteMate tester.',
      avatarUrl: null,
      verificationStatus: 'approved',
      trustScore: 95,
      averageRating: 4.9,
      completedTripCount: 12,
      connectionCount: 5,
      createdAt: now,
      updatedAt: now,
    });
    usersSeeded += 1;
  }

  // 4. Seed Demo Admin Account (admin@kiet.edu / AdminPassword123)
  const demoAdminEmail = 'admin@kiet.edu';
  const existingAdmin = await usersCollection.findOne({ emailNormalized: demoAdminEmail });
  if (!existingAdmin) {
    const adminPasswordHash = await hashPassword('AdminPassword123');
    const adminResult = await usersCollection.insertOne({
      email: demoAdminEmail,
      emailNormalized: demoAdminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin',
      status: 'active',
      emailVerifiedAt: now,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await profilesCollection.insertOne({
      userId: adminResult.insertedId.toHexString(),
      fullName: 'Campus Administrator',
      collegeId,
      academicYear: null,
      gender: 'other',
      bio: 'Institutional Safety & Moderation Lead.',
      avatarUrl: null,
      verificationStatus: 'approved',
      trustScore: 100,
      averageRating: 5.0,
      completedTripCount: 0,
      connectionCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    usersSeeded += 1;
  }

  return {
    indexesCreated: indexResult.created.length,
    collegesSeeded,
    usersSeeded,
    message: `Seeding complete: ${indexResult.created.length} indexes checked, ${collegesSeeded} colleges, ${usersSeeded} demo accounts ready.`,
  };
}
