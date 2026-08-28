import { getDb } from '../db/mongo.js';
import { COLLECTIONS } from '../db/collections.js';

export type TelemetryEventType =
  | 'USER_REGISTERED'
  | 'EMAIL_VERIFIED'
  | 'ID_UPLOADED'
  | 'ID_APPROVED'
  | 'ID_REJECTED'
  | 'SEARCH_PERFORMED'
  | 'TRIP_VIEWED'
  | 'MATCHES_VIEWED'
  | 'CO_TRAVEL_REQUESTED'
  | 'CO_TRAVEL_ACCEPTED'
  | 'CO_TRAVEL_DECLINED'
  | 'TRIP_CREATED'
  | 'TRIP_JOINED'
  | 'TRIP_CANCELLED'
  | 'TRIP_COMPLETED'
  | 'MESSAGE_SENT'
  | 'GROUP_CREATED'
  | 'GROUP_JOINED'
  | 'PROFILE_VIEWED'
  | 'SOS_TRIGGERED'
  | 'SOS_RESOLVED'
  | 'REPORT_FILED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT';

export interface TelemetryEvent {
  id: string;
  userId: string;
  userName: string;
  eventType: TelemetryEventType;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Bounded in-memory ring buffer holding recent live telemetry events (last 500)
 * + Async persistence into MongoDB `activityLogs` collection.
 */
export class TelemetryManager {
  private maxBufferSize: number;
  private buffer: TelemetryEvent[] = [];

  constructor(maxBufferSize = 500) {
    this.maxBufferSize = maxBufferSize;
  }

  async recordEvent(
    userId: string,
    userName: string,
    eventType: TelemetryEventType,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<TelemetryEvent> {
    const event: TelemetryEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId,
      userName: userName || 'Student',
      eventType,
      description,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    // Add to in-memory bounded ring buffer
    this.buffer.unshift(event);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.length = this.maxBufferSize;
    }

    // Persist to MongoDB asynchronously (non-blocking)
    try {
      const db = getDb();
      if (db) {
        db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
          ...event,
          createdAt: new Date(event.timestamp),
        }).catch(() => {
          // Ignore background logging errors
        });
      }
    } catch {
      // Ignore database readiness errors during startup
    }

    return event;
  }

  getRecentEvents(limit = 100): TelemetryEvent[] {
    return this.buffer.slice(0, limit);
  }

  getUserEvents(userId: string, limit = 50): TelemetryEvent[] {
    return this.buffer.filter((e) => e.userId === userId).slice(0, limit);
  }

  clear(): void {
    this.buffer = [];
  }
}

export const telemetryManager = new TelemetryManager(500);
