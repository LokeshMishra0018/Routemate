import { getDb } from '../db/mongo.js';
import { COLLECTIONS } from '../db/collections.js';

export interface LivePresence {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  college: string;
  branch?: string;
  verificationBadge?: 'verified' | 'id_pending' | 'unverified' | 'admin';
  trustScore?: number;
  role: string;
  currentPath: string;
  currentAction: string;
  deviceCategory: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  browserInfo: string;
  connectedAt: string;
  lastPingAt: string;
  disconnectedAt?: string | null;
  isOnline: boolean;
  isIdle: boolean;
  sessionDurationSeconds: number;
}

export interface PresenceStore {
  setPresence(socketId: string, presence: LivePresence): Promise<void> | void;
  updatePresence(socketId: string, updates: Partial<LivePresence>): Promise<void> | void;
  removePresence(socketId: string): Promise<void> | void;
  getPresence(socketId: string): Promise<LivePresence | null> | (LivePresence | null);
  getAllPresence(): Promise<LivePresence[]> | LivePresence[];
  getUserPresence(userId: string): Promise<LivePresence[]> | LivePresence[];
  clear(): Promise<void> | void;
}

/**
 * MongoDB-Persistent & In-Memory Presence Store with student session history retention.
 */
export class MemoryPresenceStore implements PresenceStore {
  private activePresences: Map<string, LivePresence> = new Map();
  private sessionHistory: Map<string, LivePresence> = new Map(); // Keyed by userId
  private todayPeak = 0;
  private todayPeakTime = 'Live Now';
  private allTimePeak = 0;
  private allTimePeakDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  private currentDay = new Date().toDateString();
  private hourlyMax: number[] = new Array(24).fill(0);

  private checkDayReset(): void {
    const today = new Date().toDateString();
    if (this.currentDay !== today) {
      this.currentDay = today;
      this.todayPeak = this.activePresences.size;
      this.todayPeakTime = 'Live Now';
      this.hourlyMax = new Array(24).fill(0);
    }
  }

  private updatePeakMetrics(): void {
    this.checkDayReset();
    const count = this.activePresences.size;
    const now = new Date();
    const hour = now.getHours();

    if (count > this.hourlyMax[hour]) {
      this.hourlyMax[hour] = count;
    }

    if (count > this.todayPeak) {
      this.todayPeak = count;
      this.todayPeakTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} (Peak)`;
    }

    if (count > this.allTimePeak) {
      this.allTimePeak = count;
      this.allTimePeakDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  /**
   * Loads saved student sessions from MongoDB on backend boot / restart
   */
  async initFromDb(): Promise<void> {
    try {
      const db = getDb();
      if (!db) return;

      const docs = await db
        .collection(COLLECTIONS.STUDENT_SESSIONS)
        .find({})
        .sort({ lastPingAt: -1 })
        .limit(100)
        .toArray();

      for (const doc of docs) {
        const p = doc as unknown as LivePresence;
        if (p.userId && !this.sessionHistory.has(p.userId)) {
          this.sessionHistory.set(p.userId, {
            ...p,
            isOnline: false, // Disconnected until active socket connects
          });
        }
      }
    } catch {
      // Ignore DB init errors on cold start
    }
  }

  private persistSessionAsync(presence: LivePresence): void {
    try {
      const db = getDb();
      if (db) {
        db.collection(COLLECTIONS.STUDENT_SESSIONS)
          .updateOne(
            { userId: presence.userId },
            { $set: { ...presence, updatedAt: new Date() } },
            { upsert: true }
          )
          .catch(() => {});
      }
    } catch {}
  }

  setPresence(socketId: string, presence: LivePresence): void {
    const enrichedPresence: LivePresence = {
      ...presence,
      isOnline: true,
      disconnectedAt: null,
    };
    this.activePresences.set(socketId, enrichedPresence);
    this.sessionHistory.set(presence.userId, enrichedPresence);
    this.persistSessionAsync(enrichedPresence);
    this.updatePeakMetrics();
  }

  updatePresence(socketId: string, updates: Partial<LivePresence>): void {
    const existing = this.activePresences.get(socketId);
    if (existing) {
      const updated: LivePresence = {
        ...existing,
        ...updates,
        isOnline: true,
        lastPingAt: updates.lastPingAt || new Date().toISOString(),
      };
      this.activePresences.set(socketId, updated);
      this.sessionHistory.set(existing.userId, updated);
      this.persistSessionAsync(updated);
    }
    this.updatePeakMetrics();
  }

  removePresence(socketId: string): void {
    const existing = this.activePresences.get(socketId);
    if (existing) {
      const now = new Date();
      const connTime = new Date(existing.connectedAt).getTime();
      const durationSeconds = Math.max(0, Math.floor((now.getTime() - connTime) / 1000));

      const disconnectedRecord: LivePresence = {
        ...existing,
        isOnline: false,
        disconnectedAt: now.toISOString(),
        currentAction: 'Disconnected (Went Offline)',
        sessionDurationSeconds: durationSeconds,
      };

      this.sessionHistory.set(existing.userId, disconnectedRecord);
      this.activePresences.delete(socketId);
      this.persistSessionAsync(disconnectedRecord);
    }
  }

  getPresence(socketId: string): LivePresence | null {
    return this.activePresences.get(socketId) || null;
  }

  /**
   * Returns all active online students + recently offline student sessions
   * (Sorted with Active students first, then recently disconnected)
   */
  getAllPresence(): LivePresence[] {
    const now = Date.now();
    const sessions = Array.from(this.sessionHistory.values()).map((p) => {
      const connTime = new Date(p.connectedAt).getTime();
      const discTime = p.disconnectedAt ? new Date(p.disconnectedAt).getTime() : now;
      return {
        ...p,
        sessionDurationSeconds: Math.max(0, Math.floor((discTime - connTime) / 1000)),
      };
    });

    sessions.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      const timeA = a.disconnectedAt ? new Date(a.disconnectedAt).getTime() : new Date(a.lastPingAt).getTime();
      const timeB = b.disconnectedAt ? new Date(b.disconnectedAt).getTime() : new Date(b.lastPingAt).getTime();
      return timeB - timeA;
    });

    return sessions;
  }

  getUserPresence(userId: string): LivePresence[] {
    return this.getAllPresence().filter((p) => p.userId === userId);
  }

  getPeakStats(): { todayPeak: number; todayPeakTime: string; allTimePeak: number; allTimePeakDate: string; hourlyMax: number[] } {
    this.checkDayReset();
    const current = this.activePresences.size;
    return {
      todayPeak: Math.max(current, this.todayPeak),
      todayPeakTime: this.todayPeakTime,
      allTimePeak: Math.max(current, this.todayPeak, this.allTimePeak),
      allTimePeakDate: this.allTimePeakDate,
      hourlyMax: [...this.hourlyMax],
    };
  }

  clear(): void {
    this.activePresences.clear();
    this.sessionHistory.clear();
    this.todayPeak = 0;
    this.allTimePeak = 0;
    this.hourlyMax = new Array(24).fill(0);
  }
}

export const presenceStore = new MemoryPresenceStore();
