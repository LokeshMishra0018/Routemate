import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { getEnv } from '../config/env.js';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;

let isConnecting = false;
let autoReconnectTimer: NodeJS.Timeout | null = null;

export interface MongoHealthStatus {
  connected: boolean;
  databaseName?: string;
  pingMs?: number;
  error?: string;
}

export function sanitizeMongoError(message: string): string {
  return message.replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, 'mongodb$1://[REDACTED]@');
}

/**
 * Connect to MongoDB Atlas / Local MongoDB instance with auto-retry and pooling
 */
export async function connectMongo(customUri?: string, customDbName?: string): Promise<{ client: MongoClient; db: Db }> {
  if (client && db && isConnected) {
    return { client, db };
  }

  if (isConnecting) {
    // Wait for in-flight connection attempt
    while (isConnecting) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (client && db && isConnected) {
      return { client, db };
    }
  }

  isConnecting = true;
  const env = getEnv();
  const uri = customUri || env.MONGODB_URI;
  const dbName = customDbName || env.MONGODB_DB_NAME;

  const options: MongoClientOptions = {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 15000,
    retryWrites: true,
    retryReads: true,
  };

  try {
    if (client) {
      try {
        await client.close();
      } catch {
        // ignore close errors during reset
      }
      client = null;
      db = null;
      isConnected = false;
    }

    client = new MongoClient(uri, options);
    await client.connect();
    db = client.db(dbName);
    isConnected = true;

    if (autoReconnectTimer) {
      clearTimeout(autoReconnectTimer);
      autoReconnectTimer = null;
    }

    client.on('connectionClosed', () => {
      isConnected = false;
      scheduleAutoReconnect();
    });

    client.on('close', () => {
      isConnected = false;
      scheduleAutoReconnect();
    });

    client.on('error', () => {
      isConnected = false;
      scheduleAutoReconnect();
    });

    return { client, db };
  } catch (error) {
    isConnected = false;
    client = null;
    db = null;
    const sanitizedMsg = sanitizeMongoError(error instanceof Error ? error.message : String(error));
    const safeError = new Error(sanitizedMsg);
    throw safeError;
  } finally {
    isConnecting = false;
  }
}

function scheduleAutoReconnect(): void {
  if (autoReconnectTimer || isConnecting) {
    return;
  }
  autoReconnectTimer = setTimeout(async () => {
    autoReconnectTimer = null;
    try {
      await connectMongo();
    } catch {
      scheduleAutoReconnect();
    }
  }, 5000);
  if (autoReconnectTimer.unref) {
    autoReconnectTimer.unref();
  }
}

import { ServiceUnavailableError } from '../utils/errors.js';

/**
 * Returns the active MongoDB database instance.
 * Recovers or throws ServiceUnavailableError if database is not connected.
 */
export function getDb(): Db {
  if (db && isConnected) {
    return db;
  }
  if (client) {
    const env = getEnv();
    db = client.db(env.MONGODB_DB_NAME);
    isConnected = true;
    return db;
  }
  scheduleAutoReconnect();
  throw new ServiceUnavailableError('Database service is currently connecting to MongoDB Atlas. Please try again shortly.');
}

/**
 * Returns the active MongoClient instance.
 */
export function getMongoClient(): MongoClient {
  if (client && isConnected) {
    return client;
  }
  scheduleAutoReconnect();
  throw new ServiceUnavailableError('MongoClient is currently connecting to MongoDB Atlas. Please try again shortly.');
}

/**
 * Check MongoDB health and measure ping latency
 */
export async function checkMongoHealth(): Promise<MongoHealthStatus> {
  if (!client || !db || !isConnected) {
    return { connected: false, error: 'MongoDB client is disconnected' };
  }

  const start = Date.now();
  try {
    await db.command({ ping: 1 });
    const pingMs = Date.now() - start;
    return {
      connected: true,
      databaseName: db.databaseName,
      pingMs,
    };
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      databaseName: db?.databaseName,
      error: sanitizeMongoError(rawError),
    };
  }
}

/**
 * Gracefully disconnect from MongoDB
 */
export async function disconnectMongo(): Promise<void> {
  if (client) {
    try {
      await client.close();
    } finally {
      client = null;
      db = null;
      isConnected = false;
    }
  }
}

/**
 * Check if MongoDB is connected
 */
export function isMongoConnected(): boolean {
  return isConnected;
}
