import { buildApp } from './app.js';
import { getEnv } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/mongo.js';
import { ensureIndexes } from './db/indexes.js';
import { initSocketIO, closeSocketIO } from './lib/socket.js';

async function startServer(): Promise<void> {
  // 1. Validate Environment
  const env = getEnv();

  // 2. Connect to MongoDB Atlas / Local MongoDB
  console.log('Connecting to MongoDB...');
  try {
    const { db } = await connectMongo();
    console.log(`Connected to MongoDB database: ${db.databaseName}`);

    // Ensure database indexes on startup
    console.log('Ensuring MongoDB indexes...');
    const indexResult = await ensureIndexes(db);
    console.log(`Indexes ensured: ${indexResult.created.length} active`);
    if (indexResult.failed.length > 0) {
      console.warn(`Index creation warnings:`, indexResult.failed);
    }
  } catch (err) {
    console.warn(`Warning: Could not connect to MongoDB on startup. (Server will run in degraded mode). Error:`, err);
  }

  // 3. Build Fastify App
  const app = await buildApp({ env });

  // 4. Initialize Fastify network listener
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`RouteMate HTTP Server running on http://${env.HOST}:${env.PORT}`);

    // 5. Initialize Socket.IO on the underlying Fastify HTTP server
    const httpServer = app.server;
    initSocketIO(httpServer);
    console.log(`RouteMate Socket.IO Server initialized on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err, 'Failed to start server');
    process.exit(1);
  }

  // 6. Graceful Shutdown Handler
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      try {
        await closeSocketIO();
        await app.close();
        await disconnectMongo();
        console.log('Graceful shutdown completed successfully.');
        process.exit(0);
      } catch (shutdownErr) {
        console.error('Error during graceful shutdown:', shutdownErr);
        process.exit(1);
      }
    });
  }
}

// Start server
startServer().catch((err) => {
  console.error('Fatal error starting RouteMate server:', err);
  process.exit(1);
});
