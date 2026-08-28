import { Db, IndexSpecification, CreateIndexesOptions } from 'mongodb';
import { COLLECTIONS } from './collections.js';

export interface IndexDefinition {
  collection: string;
  indexSpec: IndexSpecification;
  options?: CreateIndexesOptions;
}

export const REQUIRED_INDEXES: IndexDefinition[] = [
  // Users Collection
  {
    collection: COLLECTIONS.USERS,
    indexSpec: { emailNormalized: 1 },
    options: { unique: true, name: 'idx_users_emailNormalized_unique' },
  },

  // Profiles Collection
  {
    collection: COLLECTIONS.PROFILES,
    indexSpec: { userId: 1 },
    options: { unique: true, name: 'idx_profiles_userId_unique' },
  },

  // Colleges Collection
  {
    collection: COLLECTIONS.COLLEGES,
    indexSpec: { domain: 1 },
    options: { unique: true, name: 'idx_colleges_domain_unique' },
  },

  // Verification Requests Collection
  {
    collection: COLLECTIONS.VERIFICATION_REQUESTS,
    indexSpec: { status: 1, createdAt: -1 },
    options: { name: 'idx_verif_status_createdAt' },
  },
  {
    collection: COLLECTIONS.VERIFICATION_REQUESTS,
    indexSpec: { userId: 1, createdAt: -1 },
    options: { name: 'idx_verif_userId_createdAt' },
  },

  // Trips Collection
  {
    collection: COLLECTIONS.TRIPS,
    indexSpec: { userId: 1, travelDate: 1 },
    options: { name: 'idx_trips_userId_travelDate' },
  },
  {
    collection: COLLECTIONS.TRIPS,
    indexSpec: { travelDate: 1, status: 1 },
    options: { name: 'idx_trips_travelDate_status' },
  },
  {
    collection: COLLECTIONS.TRIPS,
    indexSpec: { 'destination.normalizedName': 1, travelDate: 1 },
    options: { name: 'idx_trips_destination_travelDate' },
  },
  {
    collection: COLLECTIONS.TRIPS,
    indexSpec: { 'source.normalizedName': 1, travelDate: 1 },
    options: { name: 'idx_trips_source_travelDate' },
  },
  {
    collection: COLLECTIONS.TRIPS,
    indexSpec: { 'source.coordinates': '2dsphere' },
    options: { name: 'idx_trips_source_2dsphere' },
  },
  {
    collection: COLLECTIONS.TRIPS,
    indexSpec: { 'destination.coordinates': '2dsphere' },
    options: { name: 'idx_trips_destination_2dsphere' },
  },

  // Matches Collection
  {
    collection: COLLECTIONS.MATCHES,
    indexSpec: { tripId: 1, status: 1 },
    options: { name: 'idx_matches_tripId_status' },
  },
  {
    collection: COLLECTIONS.MATCHES,
    indexSpec: { candidateTripId: 1, status: 1 },
    options: { name: 'idx_matches_candidateTripId_status' },
  },
  {
    collection: COLLECTIONS.MATCHES,
    indexSpec: { tripId: 1, candidateTripId: 1 },
    options: { unique: true, name: 'idx_matches_trip_pair_unique' },
  },

  // Connections Collection
  {
    collection: COLLECTIONS.CONNECTIONS,
    indexSpec: { requesterId: 1, status: 1 },
    options: { name: 'idx_connections_requesterId_status' },
  },
  {
    collection: COLLECTIONS.CONNECTIONS,
    indexSpec: { recipientId: 1, status: 1 },
    options: { name: 'idx_connections_recipientId_status' },
  },

  // Messages Collection
  {
    collection: COLLECTIONS.MESSAGES,
    indexSpec: { conversationId: 1, createdAt: -1 },
    options: { name: 'idx_messages_conversationId_createdAt' },
  },

  // Notifications Collection
  {
    collection: COLLECTIONS.NOTIFICATIONS,
    indexSpec: { userId: 1, createdAt: -1 },
    options: { name: 'idx_notifications_userId_createdAt' },
  },
  {
    collection: COLLECTIONS.NOTIFICATIONS,
    indexSpec: { userId: 1, readAt: 1 },
    options: { name: 'idx_notifications_userId_readAt' },
  },

  // Reports Collection
  {
    collection: COLLECTIONS.REPORTS,
    indexSpec: { status: 1, createdAt: -1 },
    options: { name: 'idx_reports_status_createdAt' },
  },

  // Blocks Collection
  {
    collection: COLLECTIONS.BLOCKS,
    indexSpec: { blockerId: 1, blockedUserId: 1 },
    options: { unique: true, name: 'idx_blocks_pair_unique' },
  },

  // Sessions Collection
  {
    collection: COLLECTIONS.SESSIONS,
    indexSpec: { userId: 1 },
    options: { name: 'idx_sessions_userId' },
  },
  {
    collection: COLLECTIONS.SESSIONS,
    indexSpec: { expiresAt: 1 },
    options: { expireAfterSeconds: 0, name: 'idx_sessions_expiresAt_ttl' },
  },

  // Emergency Contacts Collection
  {
    collection: COLLECTIONS.EMERGENCY_CONTACTS,
    indexSpec: { userId: 1, isPrimary: -1 },
    options: { name: 'idx_emergency_contacts_userId_isPrimary' },
  },

  // SOS Events Collection
  {
    collection: COLLECTIONS.SOS_EVENTS,
    indexSpec: { status: 1, triggeredAt: -1 },
    options: { name: 'idx_sos_events_status_triggeredAt' },
  },

  // Activity Logs Collection (Telemetry)
  {
    collection: COLLECTIONS.ACTIVITY_LOGS,
    indexSpec: { createdAt: -1 },
    options: { name: 'idx_activity_logs_createdAt' },
  },
  {
    collection: COLLECTIONS.ACTIVITY_LOGS,
    indexSpec: { userId: 1, eventType: 1 },
    options: { name: 'idx_activity_logs_userId_eventType' },
  },

  // Search Logs Collection (Demand Analytics)
  {
    collection: COLLECTIONS.SEARCH_LOGS,
    indexSpec: { createdAt: -1 },
    options: { name: 'idx_search_logs_createdAt' },
  },
  {
    collection: COLLECTIONS.SEARCH_LOGS,
    indexSpec: { 'source.normalizedName': 1, 'destination.normalizedName': 1 },
    options: { name: 'idx_search_logs_corridor' },
  },
];

/**
 * Ensures all required indexes exist in MongoDB.
 * This operation is idempotent and safe to run on startup.
 */
export async function ensureIndexes(db: Db): Promise<{ created: string[]; failed: { index: string; error: string }[] }> {
  const created: string[] = [];
  const failed: { index: string; error: string }[] = [];

  for (const def of REQUIRED_INDEXES) {
    const collection = db.collection(def.collection);
    try {
      const indexName = await collection.createIndex(def.indexSpec, def.options || {});
      created.push(`${def.collection}.${indexName}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      failed.push({
        index: `${def.collection}.${JSON.stringify(def.indexSpec)}`,
        error: errorMsg,
      });
    }
  }

  return { created, failed };
}
