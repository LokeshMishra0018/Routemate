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

  setPresence(socketId: string, presence: LivePresence): void {
    this.presences.set(socketId, presence);
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

  clear(): void {
    this.presences.clear();
  }
}

export const presenceStore = new MemoryPresenceStore();
