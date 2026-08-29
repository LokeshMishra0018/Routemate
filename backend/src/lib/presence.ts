export interface LivePresence {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  college: string;
  role: string;
  currentPath: string;
  currentAction: string;
  deviceCategory: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  browserInfo: string;
  connectedAt: string;
  lastPingAt: string;
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
 * In-memory thread-safe Presence Store.
 * Pluggable interface for future Redis / distributed cluster support.
 */
export class MemoryPresenceStore implements PresenceStore {
  private presences: Map<string, LivePresence> = new Map();
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
      this.todayPeak = this.presences.size;
      this.todayPeakTime = 'Live Now';
      this.hourlyMax = new Array(24).fill(0);
    }
  }

  private updatePeakMetrics(): void {
    this.checkDayReset();
    const count = this.presences.size;
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

  setPresence(socketId: string, presence: LivePresence): void {
    this.presences.set(socketId, presence);
    this.updatePeakMetrics();
  }

  updatePresence(socketId: string, updates: Partial<LivePresence>): void {
    const existing = this.presences.get(socketId);
    if (existing) {
      this.presences.set(socketId, {
        ...existing,
        ...updates,
        lastPingAt: updates.lastPingAt || new Date().toISOString(),
      });
    }
    this.updatePeakMetrics();
  }

  removePresence(socketId: string): void {
    this.presences.delete(socketId);
  }

  getPresence(socketId: string): LivePresence | null {
    return this.presences.get(socketId) || null;
  }

  getAllPresence(): LivePresence[] {
    const now = Date.now();
    return Array.from(this.presences.values()).map((p) => {
      const connTime = new Date(p.connectedAt).getTime();
      return {
        ...p,
        sessionDurationSeconds: Math.max(0, Math.floor((now - connTime) / 1000)),
      };
    });
  }

  getUserPresence(userId: string): LivePresence[] {
    return this.getAllPresence().filter((p) => p.userId === userId);
  }

  getPeakStats(): { todayPeak: number; todayPeakTime: string; allTimePeak: number; allTimePeakDate: string; hourlyMax: number[] } {
    this.checkDayReset();
    const current = this.presences.size;
    return {
      todayPeak: Math.max(current, this.todayPeak),
      todayPeakTime: this.todayPeakTime,
      allTimePeak: Math.max(current, this.todayPeak, this.allTimePeak),
      allTimePeakDate: this.allTimePeakDate,
      hourlyMax: [...this.hourlyMax],
    };
  }

  clear(): void {
    this.presences.clear();
    this.todayPeak = 0;
    this.allTimePeak = 0;
    this.hourlyMax = new Array(24).fill(0);
  }
}

export const presenceStore = new MemoryPresenceStore();
