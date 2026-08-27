import { Db } from 'mongodb';
import { COLLECTIONS } from './collections.js';
import { ensureIndexes } from './indexes.js';

export interface SeedResult {
  indexesCreated: number;
  collegesSeeded: number;
  message: string;
}

/**
 * Seed initial baseline data required by RouteMate (such as KIET college).
 * Idempotent: safe to run multiple times without duplicating data.
 */
export async function seedDatabase(db: Db): Promise<SeedResult> {
  // 1. Ensure indexes first
  const indexResult = await ensureIndexes(db);

  // 2. Seed KIET College if not already present
  const collegesCollection = db.collection(COLLECTIONS.COLLEGES);
  const kietExists = await collegesCollection.findOne({ domain: 'kiet.edu' });

  let collegesSeeded = 0;
  if (!kietExists) {
    const now = new Date();
    await collegesCollection.insertOne({
      name: 'KIET Group of Institutions',
      domain: 'kiet.edu',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    collegesSeeded += 1;
  }

  return {
    indexesCreated: indexResult.created.length,
    collegesSeeded,
    message: `Seeding complete: ${indexResult.created.length} indexes checked, ${collegesSeeded} colleges seeded.`,
  };
}
