import pino from 'pino';
import { buildApp } from './app.js';
import { getEnv } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/mongo.js';
import { ensureIndexes } from './db/indexes.js';
import { initSocketIO, closeSocketIO } from './lib/socket.js';

// Structured server lifecycle logger
const env = getEnv();
const isDev = env.NODE_ENV === 'development';
const logger = pino({
  level: env.LOG_LEVEL,
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

let isShuttingDown = false;

async function startServer(): Promise<void> {
  logger.info({ nodeEnv: env.NODE_ENV, port: env.PORT, host: env.HOST }, 'Initializing RouteMate backend server...');

  // 1. Connect to MongoDB Atlas / Local MongoDB
  logger.info('Connecting to MongoDB...');
  try {
    const { db } = await connectMongo();
    logger.info({ database: db.databaseName }, 'Successfully connected to MongoDB');

    // 2. Ensure database indexes on startup
    logger.info('Verifying and ensuring database indexes...');
    const indexResult = await ensureIndexes(db);
    logger.info(
      {
        createdCount: indexResult.created.length,
        failedCount: indexResult.failed.length,
      },
      'Index synchronization complete'
    );
    if (indexResult.failed.length > 0) {
      logger.warn({ failedIndexes: indexResult.failed }, 'Some indexes could not be created');
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (env.NODE_ENV === 'production') {
      logger.fatal(
        { err: errorMessage },
        'Failed to connect to MongoDB Atlas in production. Halting startup.'
      );
      process.exit(1);
    } else {
      logger.warn(
        { err: errorMessage },
        'Could not connect to MongoDB on startup. Running in degraded local development mode.'
      );
    }
  }

  // 3. Build Fastify App instance
  const app = await buildApp({ env });

  // 4. Start Fastify network listener
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info({ url: `http://${env.HOST}:${env.PORT}` }, 'RouteMate HTTP Server is ready to receive requests');

    // 5. Initialize Socket.IO on the Fastify HTTP server
    initSocketIO(app.server);
    logger.info('RouteMate Socket.IO gateway initialized');
  } catch (err) {
    logger.fatal({ err }, 'Fatal error during server startup');
    process.exit(1);
  }

  // 6. Graceful Shutdown Handler
  const handleShutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    logger.info({ signal }, 'Received shutdown signal. Starting graceful shutdown sequence...');

    // Force exit if graceful shutdown takes longer than 10 seconds
    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out after 10s. Forcing exit.');
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    try {
      // 1. Stop receiving new realtime messages & disconnect sockets
      logger.info('Closing Socket.IO gateway...');
      await closeSocketIO();

      // 2. Stop receiving new HTTP requests & close Fastify server
      logger.info('Closing Fastify HTTP server...');
      await app.close();

      // 3. Close database connection pool
      logger.info('Closing MongoDB connection pool...');
      await disconnectMongo();

      logger.info('Graceful shutdown completed cleanly.');
      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (shutdownErr) {
      logger.error({ err: shutdownErr }, 'Error encountered during graceful shutdown');
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

// Start server
startServer().catch((err) => {
  logger.fatal({ err }, 'Unhandled exception during server bootstrap');
  process.exit(1);
});
