import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectMongo, disconnectMongo } from '../../src/db/mongo.js';
import { seedDatabase } from '../../src/db/seed.js';

let mongod: MongoMemoryServer | null = null;

export async function setupTestDatabase(): Promise<string> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const { db } = await connectMongo(uri, 'routemate_test_mem');
  await seedDatabase(db);
  return uri;
}

export async function teardownTestDatabase(): Promise<void> {
  await disconnectMongo();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
