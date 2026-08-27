import { connectMongo, disconnectMongo } from './mongo.js';
import { seedDatabase } from './seed.js';

async function main() {
  console.log('🌱 Connecting to database to seed default data...');
  try {
    const { db } = await connectMongo();
    console.log(`Connected to database: ${db.databaseName}`);
    
    const result = await seedDatabase(db);
    console.log(`✅ ${result.message}`);
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    process.exit(1);
  } finally {
    await disconnectMongo();
    process.exit(0);
  }
}

main();
