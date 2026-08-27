import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { getEnv } from '../config/env.js';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;

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
 * Connect to MongoDB Atlas / Local MongoDB instance
 */
export async function connectMongo(customUri?: string, customDbName?: string): Promise<{ client: MongoClient; db: Db }> {
  if (client && db && isConnected) {
    return { client, db };
  }

  const env = getEnv();
  const uri = customUri || env.MONGODB_URI;
  const dbName = customDbName || env.MONGODB_DB_NAME;

  const options: MongoClientOptions = {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  };

  try {
    client = new MongoClient(uri, options);
    await client.connect();
    db = client.db(dbName);
    isConnected = true;

    client.on('connectionClosed', () => {
      isConnected = false;
    });

    client.on('close', () => {
      isConnected = false;
    });

    return { client, db };
  } catch (error) {
    isConnected = false;
    client = null;
    db = null;
    const sanitizedMsg = sanitizeMongoError(error instanceof Error ? error.message : String(error));
    const safeError = new Error(sanitizedMsg);
    throw safeError;
  }
}

/**
 * Returns the active MongoDB database instance.
 * Throws if database is not connected.
 */
export function getDb(): Db {
  if (!db || !isConnected) {
    throw new Error('Database is not connected. Ensure connectMongo() is called first.');
  }
  return db;
}

/**
 * Returns the active MongoClient instance.
 */
export function getMongoClient(): MongoClient {
  if (!client || !isConnected) {
    throw new Error('MongoClient is not connected. Ensure connectMongo() is called first.');
  }
  return client;
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
