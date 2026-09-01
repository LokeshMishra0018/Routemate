import { getDb } from '../db/mongo.js';
import { COLLECTIONS } from '../db/collections.js';

export interface StudentTimelineEvent {
  id: string;
  action: string;
  path: string;
  category?: 'auth' | 'navigation' | 'action' | 'lifecycle';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

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
  timeline?: StudentTimelineEvent[];
  updatedAt?: string | Date;
}

export interface PresenceStore {
  setPresence(socketId: string, presence: LivePresence): Promise<void> | void;
  updatePresence(socketId: string, updates: Partial<LivePresence>): Promise<void> | void;
  addTimelineEvent(userId: string, event: Omit<StudentTimelineEvent, 'id' | 'timestamp'>): Promise<void> | void;
  removePresence(socketId: string): Promise<void> | void;
  getPresence(socketId: string): Promise<LivePresence | null> | (LivePresence | null);
  getAllPresence(): Promise<LivePresence[]> | LivePresence[];
  getUserPresence(userId: string): Promise<LivePresence[]> | LivePresence[];
  getHistoricalPresence(range?: 'live' | '24h' | '7d'): Promise<LivePresence[]>;
  clear(): Promise<void> | void;
}

/**
 * MongoDB-Persistent & In-Memory Presence Store with 7-day student session retention and action timelines.
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
   * Loads saved student sessions from MongoDB on backend boot / restart (Preserves past 7 days)
   */
  async initFromDb(): Promise<void> {
    try {
      const db = getDb();
      if (!db) return;

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // 1. Load from STUDENT_SESSIONS
      const docs = await db
        .collection(COLLECTIONS.STUDENT_SESSIONS)
        .find({
          $or: [
            { updatedAt: { $gte: sevenDaysAgo } },
            { lastPingAt: { $gte: sevenDaysAgo.toISOString() } },
            { createdAt: { $gte: sevenDaysAgo } },
          ],
        })
        .sort({ lastPingAt: -1 })
        .limit(200)
        .toArray();

      for (const doc of docs) {
        const p = doc as unknown as LivePresence;
        if (p.userId && !this.sessionHistory.has(p.userId)) {
          this.sessionHistory.set(p.userId, {
            ...p,
            isOnline: false, // Disconnected until active socket connects
            timeline: Array.isArray(p.timeline) ? p.timeline : [],
          });
        }
      }

      // 2. Supplement from user login sessions if STUDENT_SESSIONS is newly populated
      if (this.sessionHistory.size < 5) {
        const pastSessions = await db
          .collection(COLLECTIONS.SESSIONS)
          .find({ createdAt: { $gte: sevenDaysAgo } })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray();

        for (const s of pastSessions) {
          const uid = String(s.userId);
          if (!this.sessionHistory.has(uid)) {
            const user = (await db.collection(COLLECTIONS.USERS).findOne({ _id: s.userId as any })) as any;
            const profile = (await db.collection(COLLECTIONS.PROFILES).findOne({ userId: uid })) as any;
            if (user || profile) {
              const name = profile?.fullName || user?.email?.split('@')[0] || 'Campus Student';
              const email = user?.email || profile?.email || 'student@kiet.edu';
              const initialTimeline: StudentTimelineEvent[] = [
                {
                  id: `${s._id.toHexString()}-auth`,
                  action: `Authenticated & Logged In (${s.deviceInfo || 'Web Browser'})`,
                  path: '/dashboard',
                  category: 'auth',
                  timestamp: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
                },
              ];

              const syntheticPresence: LivePresence = {
                socketId: `past-${s._id.toHexString()}`,
                userId: uid,
                name,
                email,
                avatarUrl: profile?.avatarUrl || null,
                college: profile?.collegeName || 'KIET Group of Institutions',
                branch: profile?.branch || profile?.department,
                verificationBadge: profile?.verificationStatus || 'unverified',
                trustScore: profile?.trustScore || 85,
                role: user?.role || 'student',
                currentPath: '/dashboard',
                currentAction: 'Session Completed',
                deviceCategory: /mobile/i.test(s.deviceInfo || '') ? 'mobile' : 'desktop',
                browserInfo: /chrome/i.test(s.deviceInfo || '') ? 'Chrome' : 'Browser',
                connectedAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
                lastPingAt: s.lastUsedAt ? new Date(s.lastUsedAt).toISOString() : new Date().toISOString(),
                disconnectedAt: s.lastUsedAt ? new Date(s.lastUsedAt).toISOString() : new Date().toISOString(),
                isOnline: false,
                isIdle: false,
                sessionDurationSeconds: Math.max(
                  60,
                  Math.floor(
                    ((s.lastUsedAt ? new Date(s.lastUsedAt).getTime() : Date.now()) -
                      (s.createdAt ? new Date(s.createdAt).getTime() : Date.now())) /
                      1000
                  )
                ),
                timeline: initialTimeline,
              };

              this.sessionHistory.set(uid, syntheticPresence);
            }
          }
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
        const now = new Date();
        const expireAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7-day retention

        db.collection(COLLECTIONS.STUDENT_SESSIONS)
          .updateOne(
            { userId: presence.userId },
            {
              $set: {
                ...presence,
                updatedAt: now,
                expireAt,
              },
            },
            { upsert: true }
          )
          .catch(() => {});
      }
    } catch {}
  }

  setPresence(socketId: string, presence: LivePresence): void {
    const existing = this.sessionHistory.get(presence.userId);
    const nowIso = new Date().toISOString();

    const authEvent: StudentTimelineEvent = {
      id: `${Date.now()}-auth`,
      action: `Signed in & Session Initialized (${presence.browserInfo} on ${presence.deviceCategory})`,
      path: presence.currentPath || '/dashboard',
      category: 'auth',
      timestamp: nowIso,
    };

    let existingTimeline: StudentTimelineEvent[] = [];
    if (existing && Array.isArray(existing.timeline)) {
      existingTimeline = existing.timeline;
    }

    const updatedTimeline: StudentTimelineEvent[] = [authEvent, ...existingTimeline].slice(0, 50);

    const enrichedPresence: LivePresence = {
      ...presence,
      timeline: updatedTimeline,
      isOnline: true,
      disconnectedAt: null,
      lastPingAt: nowIso,
    };

    this.activePresences.set(socketId, enrichedPresence);
    this.sessionHistory.set(presence.userId, enrichedPresence);
    this.persistSessionAsync(enrichedPresence);
    this.updatePeakMetrics();
  }

  updatePresence(socketId: string, updates: Partial<LivePresence>): void {
    const existing = this.activePresences.get(socketId);
    if (existing) {
      const nowIso = new Date().toISOString();
      const timeline = [...(existing.timeline || [])];

      // If user navigated to a new path or performed a new action, append to timeline
      const pathChanged = updates.currentPath && updates.currentPath !== existing.currentPath;
      const actionChanged = updates.currentAction && updates.currentAction !== existing.currentAction;

      if (pathChanged || actionChanged) {
        timeline.unshift({
          id: `${Date.now()}-nav`,
          action: updates.currentAction || existing.currentAction,
          path: updates.currentPath || existing.currentPath,
          category: 'navigation',
          timestamp: nowIso,
        });

        // Limit timeline size to 50 items
        if (timeline.length > 50) {
          timeline.length = 50;
        }
      }

      const updated: LivePresence = {
        ...existing,
        ...updates,
        timeline,
        isOnline: true,
        lastPingAt: updates.lastPingAt || nowIso,
      };

      this.activePresences.set(socketId, updated);
      this.sessionHistory.set(existing.userId, updated);
      this.persistSessionAsync(updated);
    }
    this.updatePeakMetrics();
  }

  addTimelineEvent(userId: string, event: Omit<StudentTimelineEvent, 'id' | 'timestamp'>): void {
    const existing = this.sessionHistory.get(userId);
    if (existing) {
      const nowIso = new Date().toISOString();
      const newEvent: StudentTimelineEvent = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        action: event.action,
        path: event.path || existing.currentPath || '/dashboard',
        category: event.category || 'action',
        metadata: event.metadata,
        timestamp: nowIso,
      };

      const updatedTimeline = [newEvent, ...(existing.timeline || [])].slice(0, 50);
      const updated: LivePresence = {
        ...existing,
        currentAction: event.action,
        timeline: updatedTimeline,
        lastPingAt: nowIso,
      };

      for (const [sockId, p] of this.activePresences.entries()) {
        if (p.userId === userId) {
          this.activePresences.set(sockId, updated);
        }
      }

      this.sessionHistory.set(userId, updated);
      this.persistSessionAsync(updated);
    }
  }

  removePresence(socketId: string): void {
    const existing = this.activePresences.get(socketId);
    if (existing) {
      const now = new Date();
      const nowIso = now.toISOString();
      const connTime = new Date(existing.connectedAt).getTime();
      const durationSeconds = Math.max(0, Math.floor((now.getTime() - connTime) / 1000));

      const offlineEvent: StudentTimelineEvent = {
        id: `${Date.now()}-disc`,
        action: `Disconnected (Went Offline after ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`,
        path: existing.currentPath,
        category: 'lifecycle',
        timestamp: nowIso,
      };

      const updatedTimeline = [offlineEvent, ...(existing.timeline || [])].slice(0, 50);

      const disconnectedRecord: LivePresence = {
        ...existing,
        isOnline: false,
        disconnectedAt: nowIso,
        currentAction: 'Disconnected (Went Offline)',
        sessionDurationSeconds: durationSeconds,
        timeline: updatedTimeline,
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

  /**
   * Query historical presence records for past 24h or 7d
   */
  async getHistoricalPresence(range: 'live' | '24h' | '7d' = 'live'): Promise<LivePresence[]> {
    if (range === 'live') {
      return this.getAllPresence().filter((p) => p.isOnline);
    }

    const cutoffMs = range === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - cutoffMs);

    // Fetch from MongoDB
    try {
      const db = getDb();
      if (db) {
        const docs = await db
          .collection(COLLECTIONS.STUDENT_SESSIONS)
          .find({
            $or: [
              { updatedAt: { $gte: cutoffDate } },
              { lastPingAt: { $gte: cutoffDate.toISOString() } },
              { createdAt: { $gte: cutoffDate } },
            ],
          })
          .sort({ lastPingAt: -1 })
          .limit(200)
          .toArray();

        if (docs.length > 0) {
          const map = new Map<string, LivePresence>();

          // Merge with memory live states
          for (const doc of docs) {
            const p = doc as unknown as LivePresence;
            const active = this.activePresences.get(p.socketId) || Array.from(this.activePresences.values()).find((u) => u.userId === p.userId);
            map.set(p.userId, {
              ...p,
              isOnline: active ? true : false,
              timeline: Array.isArray(p.timeline) ? p.timeline : [],
            });
          }

          for (const [userId, memPresence] of this.sessionHistory.entries()) {
            if (!map.has(userId)) {
              map.set(userId, memPresence);
            }
          }

          const result = Array.from(map.values());
          result.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            const timeA = new Date(a.lastPingAt).getTime();
            const timeB = new Date(b.lastPingAt).getTime();
            return timeB - timeA;
          });

          return result;
        }
      }
    } catch {
      // fallback to memory
    }

    return this.getAllPresence().filter((p) => {
      const pingTime = new Date(p.lastPingAt).getTime();
      return pingTime >= Date.now() - cutoffMs;
    });
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
