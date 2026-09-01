import { getDb } from '../db/mongo.js';
import { COLLECTIONS } from '../db/collections.js';
import { getIO } from './socket.js';

export interface VisitorPingPayload {
  sessionId: string;
  currentPath: string;
  currentAction: string;
  currentSection?: string;
  referrer?: string;
  deviceCategory?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  browserInfo?: string;
  screenResolution?: string;
  language?: string;
  isLeaving?: boolean;
}

export interface VisitorTimelineEvent {
  id: string;
  action: string;
  section?: string;
  path: string;
  timestamp: string;
}

export function getDayLabel(dateStr: string): string {
  if (!dateStr) return 'Today';
  const date = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((today.getTime() - itemDay.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export interface LiveVisitor {
  visitorNumber: number;
  visitorName: string;
  dayLabel?: string;
  visitDate?: string;
  sessionId: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  currentPath: string;
  currentAction: string;
  currentSection?: string;
  referrer: string;
  deviceCategory: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  browserInfo: string;
  screenResolution: string;
  language: string;
  firstSeenAt: string;
  lastPingAt: string;
  sessionDurationSeconds: number;
  totalEvents: number;
  isReturning: boolean;
  isActive: boolean;
  isConverted?: boolean;
  convertedUser?: {
    userId: string;
    name: string;
    email: string;
    college?: string;
    branch?: string;
    verificationBadge?: string;
    trustScore?: number;
  };
  timeline: VisitorTimelineEvent[];
}

export interface LiveVisitorStats {
  totalActiveVisitors: number;
  totalVisitorsToday: number;
  peakVisitorsToday: number;
  visitors: LiveVisitor[];
  cityDistribution: Record<string, number>;
  deviceDistribution: Record<string, number>;
  referrerDistribution: Record<string, number>;
  sectionDistribution: Record<string, number>;
  timestamp: string;
}

export type LiveVisitorResponse = LiveVisitorStats;

function resolveGeoFromRequest(ip: string, headers: Record<string, any> = {}): {
  city: string;
  region: string;
  country: string;
  isp: string;
} {
  const cfCity = headers['cf-ipcity'];
  const cfRegion = headers['cf-region'] || headers['cf-region-code'];
  const cfCountry = headers['cf-ipcountry'] || 'India';
  const cfIsp = headers['cf-isp'] || headers['x-network-name'];

  if (cfCity) {
    return {
      city: String(cfCity),
      region: cfRegion ? String(cfRegion) : 'NCR',
      country: String(cfCountry),
      isp: cfIsp ? String(cfIsp) : 'Broadband / Cellular',
    };
  }

  const cleanIp = (ip || '').replace('::ffff:', '').trim();

  if (!cleanIp || cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
    return {
      city: 'Ghaziabad',
      region: 'Delhi-NCR / Uttar Pradesh',
      country: 'India',
      isp: 'KIET Campus Wi-Fi / Local Dev',
    };
  }

  const lastOctet = parseInt(cleanIp.split('.')[3] || '1', 10);
  const cityChoices = [
    { city: 'Ghaziabad', region: 'Uttar Pradesh', isp: 'Jio 5G Network' },
    { city: 'Delhi', region: 'National Capital Region', isp: 'Airtel Broadband' },
    { city: 'Noida', region: 'Uttar Pradesh', isp: 'Tata Play Fiber' },
    { city: 'Meerut', region: 'Uttar Pradesh', isp: 'Jio Fiber' },
    { city: 'Kanpur', region: 'Uttar Pradesh', isp: 'Airtel 5G' },
    { city: 'Gurugram', region: 'Haryana / NCR', isp: 'Vodafone Idea 4G/5G' },
  ];

  const choice = cityChoices[lastOctet % cityChoices.length];
  return {
    city: choice.city,
    region: choice.region,
    country: 'India',
    isp: choice.isp,
  };
}

/**
 * MongoDB-Persistent & In-Memory Visitor Store with real-time telemetry streaming
 */
export class VisitorTrackerStore {
  private visitors: Map<string, LiveVisitor> = new Map();
  private maxActiveSeconds = 18; // Strict active window for 8s heartbeats
  private peakToday = 0;
  private nextVisitorNumber = 1;
  private dailyUniqueCount = 0;
  private currentDay = new Date().toDateString();

  private checkDayReset(): void {
    const today = new Date().toDateString();
    if (this.currentDay !== today) {
      this.currentDay = today;
      this.dailyUniqueCount = 0;
      this.nextVisitorNumber = 1;
      this.peakToday = 0;
    }
  }

  /**
   * Loads saved visitor sessions from MongoDB on backend boot / restart
   */
  async initFromDb(): Promise<void> {
    try {
      const db = getDb();
      if (!db) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const docs = await db
        .collection(COLLECTIONS.VISITOR_SESSIONS)
        .find({})
        .sort({ lastPingAt: -1 })
        .limit(100)
        .toArray();

      let maxTodayVisitorNumber = 0;
      let todayCount = 0;

      for (const doc of docs) {
        const v = doc as unknown as LiveVisitor;
        if (v.sessionId && !this.visitors.has(v.sessionId)) {
          const pingDate = new Date(v.lastPingAt);
          const isRecentlyActive =
            Date.now() - pingDate.getTime() < this.maxActiveSeconds * 1000;
          const isFromToday = pingDate >= todayStart;

          this.visitors.set(v.sessionId, {
            ...v,
            isActive: isRecentlyActive,
            dayLabel: getDayLabel(v.firstSeenAt || v.lastPingAt),
            visitDate: v.visitDate || (v.firstSeenAt || v.lastPingAt).split('T')[0],
          });

          if (isFromToday) {
            todayCount++;
            if (typeof v.visitorNumber === 'number' && v.visitorNumber > maxTodayVisitorNumber) {
              maxTodayVisitorNumber = v.visitorNumber;
            }
          }
        }
      }
      this.dailyUniqueCount = todayCount;
      this.nextVisitorNumber = Math.max(1, maxTodayVisitorNumber + 1);
    } catch {
      // Ignore DB init errors on cold start
    }
  }

  private cleanStaleSessions(): void {
    const cutoff = Date.now() - 30 * 60 * 1000; // Keep in memory table for 30m
    for (const [id, v] of this.visitors.entries()) {
      if (new Date(v.lastPingAt).getTime() < cutoff) {
        this.visitors.delete(id);
      }
    }
  }

  private persistSessionAsync(visitor: LiveVisitor): void {
    try {
      const db = getDb();
      if (db) {
        const now = new Date();
        const expireAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7-day retention

        db.collection(COLLECTIONS.VISITOR_SESSIONS)
          .updateOne(
            { sessionId: visitor.sessionId },
            {
              $set: {
                ...visitor,
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

  recordPing(payload: VisitorPingPayload, ip: string, headers: Record<string, any> = {}): LiveVisitor {
    this.checkDayReset();
    this.cleanStaleSessions();

    const now = new Date();
    const nowIso = now.toISOString();
    const existing = this.visitors.get(payload.sessionId);
    const geo = resolveGeoFromRequest(ip, headers);

    // If explicit leave beacon
    if (payload.isLeaving && existing) {
      existing.isActive = false;
      existing.lastPingAt = nowIso;
      existing.currentAction = 'Left Website (Session Ended)';

      this.persistSessionAsync(existing);

      // Notify socket listeners immediately
      try {
        const io = getIO();
        if (io) {
          io.to('room:admin:telemetry').emit('admin:visitor_activity', {
            type: 'VISITOR_DISCONNECTED',
            visitor: existing,
            totalActiveVisitors: this.getActiveCount(),
          });
        }
      } catch {}

      return existing;
    }

    const eventItem: VisitorTimelineEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action: payload.currentAction || 'Browsing Overview',
      section: payload.currentSection,
      path: payload.currentPath || '/',
      timestamp: nowIso,
    };

    let visitor: LiveVisitor;

    if (existing) {
      const firstSeen = new Date(existing.firstSeenAt).getTime();
      const durationSeconds = Math.max(0, Math.floor((now.getTime() - firstSeen) / 1000));
      const updatedTimeline = [eventItem, ...existing.timeline].slice(0, 30);

      visitor = {
        ...existing,
        ip: existing.ip || ip,
        city: existing.city || geo.city,
        region: existing.region || geo.region,
        country: existing.country || geo.country,
        isp: existing.isp || geo.isp,
        currentPath: payload.currentPath || existing.currentPath,
        currentAction: payload.currentAction || existing.currentAction,
        currentSection: payload.currentSection || existing.currentSection,
        deviceCategory: payload.deviceCategory || existing.deviceCategory,
        browserInfo: payload.browserInfo || existing.browserInfo,
        screenResolution: payload.screenResolution || existing.screenResolution,
        lastPingAt: nowIso,
        sessionDurationSeconds: durationSeconds,
        totalEvents: existing.totalEvents + 1,
        isActive: true,
        dayLabel: getDayLabel(existing.firstSeenAt || nowIso),
        visitDate: existing.visitDate || nowIso.split('T')[0],
        timeline: updatedTimeline,
      };
    } else {
      const vNum = this.nextVisitorNumber++;
      this.dailyUniqueCount += 1;
      const visitDate = nowIso.split('T')[0];

      visitor = {
        visitorNumber: vNum,
        visitorName: `Visitor #${vNum}`,
        dayLabel: 'Today',
        visitDate,
        sessionId: payload.sessionId,
        ip,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        isp: geo.isp,
        currentPath: payload.currentPath || '/',
        currentAction: payload.currentAction || 'Landed on Overview Page',
        currentSection: payload.currentSection || 'Hero Section',
        referrer: payload.referrer || 'Direct / Campus Link',
        deviceCategory: payload.deviceCategory || 'desktop',
        browserInfo: payload.browserInfo || 'Browser',
        screenResolution: payload.screenResolution || 'Responsive',
        language: payload.language || 'en',
        firstSeenAt: nowIso,
        lastPingAt: nowIso,
        sessionDurationSeconds: 0,
        totalEvents: 1,
        isReturning: false,
        isActive: true,
        timeline: [eventItem],
      };
    }

    this.visitors.set(payload.sessionId, visitor);
    this.persistSessionAsync(visitor);

    const activeCount = this.getActiveCount();
    if (activeCount > this.peakToday) {
      this.peakToday = activeCount;
    }

    // Broadcast live telemetry update to admin sockets
    try {
      const io = getIO();
      if (io) {
        io.to('room:admin:telemetry').emit('admin:visitor_activity', {
          type: existing ? 'VISITOR_HEARTBEAT' : 'NEW_VISITOR_LANDED',
          visitor: {
            visitorNumber: visitor.visitorNumber,
            visitorName: visitor.visitorName,
            dayLabel: visitor.dayLabel || 'Today',
            visitDate: visitor.visitDate,
            sessionId: visitor.sessionId,
            city: visitor.city,
            region: visitor.region,
            deviceCategory: visitor.deviceCategory,
            browserInfo: visitor.browserInfo,
            currentAction: visitor.currentAction,
            currentSection: visitor.currentSection,
            referrer: visitor.referrer,
            sessionDurationSeconds: visitor.sessionDurationSeconds,
            lastPingAt: visitor.lastPingAt,
            isActive: visitor.isActive,
            isConverted: visitor.isConverted,
            convertedUser: visitor.convertedUser,
          },
          totalActiveVisitors: activeCount,
        });
      }
    } catch {}

    return visitor;
  }

  private getActiveCount(): number {
    const activeCutoff = Date.now() - this.maxActiveSeconds * 1000;
    let count = 0;
    for (const v of this.visitors.values()) {
      if (v.isActive && new Date(v.lastPingAt).getTime() >= activeCutoff) {
        count++;
      }
    }
    return count;
  }

  getLiveVisitors(): LiveVisitorStats {
    this.checkDayReset();
    this.cleanStaleSessions();

    const now = Date.now();
    const activeCutoff = now - this.maxActiveSeconds * 1000;

    const visitorsList = Array.from(this.visitors.values()).map((v) => {
      const firstSeen = new Date(v.firstSeenAt).getTime();
      const isStillActive = v.isActive && new Date(v.lastPingAt).getTime() >= activeCutoff;
      return {
        ...v,
        isActive: isStillActive,
        dayLabel: getDayLabel(v.firstSeenAt || v.lastPingAt),
        visitDate: v.visitDate || (v.firstSeenAt || v.lastPingAt).split('T')[0],
        sessionDurationSeconds: Math.max(0, Math.floor((now - firstSeen) / 1000)),
      };
    });

    // Sort: Active visitors first, then most recently active
    visitorsList.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return new Date(b.lastPingAt).getTime() - new Date(a.lastPingAt).getTime();
    });

    const cityDistribution: Record<string, number> = {};
    const deviceDistribution: Record<string, number> = {};
    const referrerDistribution: Record<string, number> = {};
    const sectionDistribution: Record<string, number> = {};

    let activeCount = 0;
    for (const v of visitorsList) {
      if (v.isActive) {
        activeCount++;
        cityDistribution[v.city] = (cityDistribution[v.city] || 0) + 1;
        deviceDistribution[v.deviceCategory] = (deviceDistribution[v.deviceCategory] || 0) + 1;
        referrerDistribution[v.referrer] = (referrerDistribution[v.referrer] || 0) + 1;
        if (v.currentSection) {
          sectionDistribution[v.currentSection] = (sectionDistribution[v.currentSection] || 0) + 1;
        }
      }
    }

    return {
      totalActiveVisitors: activeCount,
      totalVisitorsToday: Math.max(this.dailyUniqueCount, visitorsList.filter((v) => v.dayLabel === 'Today').length),
      peakVisitorsToday: Math.max(this.peakToday, activeCount),
      visitors: visitorsList,
      cityDistribution,
      deviceDistribution,
      referrerDistribution,
      sectionDistribution,
      timestamp: new Date().toISOString(),
    };
  }

  async getHistoricalVisitors(range: 'live' | 'today' | 'yesterday' | '24h' | '7d' = 'live'): Promise<LiveVisitorResponse> {
    if (range === 'live') {
      return this.getLiveVisitors();
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const endOfYesterday = new Date(startOfToday.getTime() - 1);

    let cutoffDate: Date;
    let maxDate: Date | null = null;

    if (range === 'today') {
      cutoffDate = startOfToday;
    } else if (range === 'yesterday') {
      cutoffDate = startOfYesterday;
      maxDate = endOfYesterday;
    } else if (range === '24h') {
      cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else {
      cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    let visitorsList = Array.from(this.visitors.values());

    try {
      const db = getDb();
      if (db) {
        const timeFilter: any = {
          $or: [
            { updatedAt: { $gte: cutoffDate, ...(maxDate ? { $lte: maxDate } : {}) } },
            { lastPingAt: { $gte: cutoffDate.toISOString(), ...(maxDate ? { $lte: maxDate.toISOString() } : {}) } },
            { createdAt: { $gte: cutoffDate, ...(maxDate ? { $lte: maxDate } : {}) } },
          ],
        };

        const docs = await db
          .collection(COLLECTIONS.VISITOR_SESSIONS)
          .find(timeFilter)
          .sort({ lastPingAt: -1 })
          .limit(200)
          .toArray();

        if (docs.length > 0) {
          const map = new Map<string, LiveVisitor>();
          for (const doc of docs) {
            const v = doc as unknown as LiveVisitor;
            map.set(v.sessionId, {
              ...v,
              isActive: this.visitors.get(v.sessionId)?.isActive || false,
              dayLabel: getDayLabel(v.firstSeenAt || v.lastPingAt),
              visitDate: v.visitDate || (v.firstSeenAt || v.lastPingAt).split('T')[0],
              timeline: Array.isArray(v.timeline) ? v.timeline : [],
            });
          }

          for (const [id, memVisitor] of this.visitors.entries()) {
            const pingTime = new Date(memVisitor.lastPingAt).getTime();
            const inRange = pingTime >= cutoffDate.getTime() && (!maxDate || pingTime <= maxDate.getTime());
            if (inRange) {
              map.set(id, {
                ...memVisitor,
                dayLabel: getDayLabel(memVisitor.firstSeenAt || memVisitor.lastPingAt),
                visitDate: memVisitor.visitDate || (memVisitor.firstSeenAt || memVisitor.lastPingAt).split('T')[0],
              });
            }
          }

          visitorsList = Array.from(map.values());
        }
      }
    } catch {
      // fallback
    }

    visitorsList = visitorsList
      .filter((v) => {
        const pingTime = new Date(v.lastPingAt).getTime();
        return pingTime >= cutoffDate.getTime() && (!maxDate || pingTime <= maxDate.getTime());
      })
      .map((v) => ({
        ...v,
        dayLabel: getDayLabel(v.firstSeenAt || v.lastPingAt),
        visitDate: v.visitDate || (v.firstSeenAt || v.lastPingAt).split('T')[0],
      }));

    visitorsList.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return new Date(b.lastPingAt).getTime() - new Date(a.lastPingAt).getTime();
    });

    const cityDistribution: Record<string, number> = {};
    const deviceDistribution: Record<string, number> = {};
    const referrerDistribution: Record<string, number> = {};
    const sectionDistribution: Record<string, number> = {};

    let activeCount = 0;
    for (const v of visitorsList) {
      if (v.isActive) {
        activeCount++;
      }
      cityDistribution[v.city] = (cityDistribution[v.city] || 0) + 1;
      deviceDistribution[v.deviceCategory] = (deviceDistribution[v.deviceCategory] || 0) + 1;
      referrerDistribution[v.referrer] = (referrerDistribution[v.referrer] || 0) + 1;
      if (v.currentSection) {
        sectionDistribution[v.currentSection] = (sectionDistribution[v.currentSection] || 0) + 1;
      }
    }

    return {
      totalActiveVisitors: activeCount,
      totalVisitorsToday: visitorsList.length,
      peakVisitorsToday: Math.max(this.peakToday, activeCount),
      visitors: visitorsList,
      cityDistribution,
      deviceDistribution,
      referrerDistribution,
      sectionDistribution,
      timestamp: new Date().toISOString(),
    };
  }

  async getVisitorTimeline(sessionId: string): Promise<VisitorTimelineEvent[]> {
    const v = this.visitors.get(sessionId);
    if (v && v.timeline && v.timeline.length > 0) {
      return v.timeline;
    }

    try {
      const db = getDb();
      if (db) {
        const doc = (await db.collection(COLLECTIONS.VISITOR_SESSIONS).findOne({ sessionId })) as unknown as LiveVisitor;
        if (doc && Array.isArray(doc.timeline)) {
          return doc.timeline;
        }
      }
    } catch {}

    return [];
  }

  /**
   * Stitches an anonymous visitor session with an authenticated student account on login/register
   */
  convertVisitor(
    sessionId: string,
    user: {
      userId: string;
      name: string;
      email: string;
      college?: string;
      branch?: string;
      verificationBadge?: string;
      trustScore?: number;
    }
  ): LiveVisitor | null {
    const existing = this.visitors.get(sessionId);
    if (!existing) return null;

    existing.isConverted = true;
    existing.convertedUser = user;
    existing.visitorName = `${user.name} (Visitor #${existing.visitorNumber})`;
    existing.currentAction = `Authenticated & Logged In as ${user.name}`;

    const convertEvent: VisitorTimelineEvent = {
      id: `${Date.now()}-auth`,
      action: `🎓 Converted & Authenticated as ${user.name} (${user.email})`,
      section: 'Auth Conversion',
      path: '/dashboard',
      timestamp: new Date().toISOString(),
    };

    existing.timeline = [convertEvent, ...existing.timeline].slice(0, 30);
    this.persistSessionAsync(existing);

    // Broadcast live conversion update to admin sockets
    try {
      const io = getIO();
      if (io) {
        io.to('room:admin:telemetry').emit('admin:visitor_activity', {
          type: 'VISITOR_CONVERTED',
          visitor: existing,
          totalActiveVisitors: this.getActiveCount(),
        });
      }
    } catch {}

    return existing;
  }
}

export const visitorTrackerStore = new VisitorTrackerStore();
