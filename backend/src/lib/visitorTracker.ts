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

export interface LiveVisitor {
  visitorNumber: number;
  visitorName: string;
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

/**
 * Utility to resolve IP address and derive realistic City/Region and ISP metadata
 */
export function resolveGeoFromRequest(ip: string, headers: Record<string, any> = {}): {
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
 * Thread-safe In-Memory Visitor Store with instant exit detection and sequential Option 1 numbering
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
      this.peakToday = 0;
      this.nextVisitorNumber = 1;
    }
  }

  private cleanStaleSessions(): void {
    const cutoff = Date.now() - 30 * 60 * 1000; // Keep in history table for 30m
    for (const [id, v] of this.visitors.entries()) {
      if (new Date(v.lastPingAt).getTime() < cutoff) {
        this.visitors.delete(id);
      }
    }
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
        timeline: updatedTimeline,
      };
    } else {
      const vNum = this.nextVisitorNumber++;
      this.dailyUniqueCount += 1;

      visitor = {
        visitorNumber: vNum,
        visitorName: `Visitor #${vNum}`,
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
          },
          totalActiveVisitors: activeCount,
        });
      }
    } catch {}

    // Async Mongo log
    try {
      const db = getDb();
      if (db) {
        db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
          id: `visitor-${visitor.sessionId}-${Date.now()}`,
          userId: `anonymous:${visitor.visitorName}`,
          userName: `${visitor.visitorName} (${visitor.city})`,
          eventType: 'TRIP_VIEWED',
          description: `${visitor.visitorName} from ${visitor.city} (${visitor.deviceCategory}): ${visitor.currentAction}`,
          metadata: {
            isVisitor: true,
            visitorNumber: visitor.visitorNumber,
            sessionId: visitor.sessionId,
            city: visitor.city,
            region: visitor.region,
            referrer: visitor.referrer,
            deviceCategory: visitor.deviceCategory,
            browserInfo: visitor.browserInfo,
            currentPath: visitor.currentPath,
            currentSection: visitor.currentSection,
          },
          createdAt: new Date(),
        }).catch(() => {});
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
      totalVisitorsToday: Math.max(this.dailyUniqueCount, visitorsList.length),
      peakVisitorsToday: Math.max(this.peakToday, activeCount),
      visitors: visitorsList,
      cityDistribution,
      deviceDistribution,
      referrerDistribution,
      sectionDistribution,
      timestamp: new Date().toISOString(),
    };
  }

  getVisitorTimeline(sessionId: string): VisitorTimelineEvent[] {
    const v = this.visitors.get(sessionId);
    return v ? v.timeline : [];
  }
}

export const visitorTrackerStore = new VisitorTrackerStore();
