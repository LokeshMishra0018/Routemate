import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryPresenceStore, LivePresence } from '../../src/lib/presence.js';
import { TelemetryManager } from '../../src/lib/telemetry.js';

describe('Presence Engine & Telemetry Buffer (Unit Tests)', () => {
  let presenceStore: MemoryPresenceStore;
  let telemetryManager: TelemetryManager;

  beforeEach(() => {
    presenceStore = new MemoryPresenceStore();
    telemetryManager = new TelemetryManager(10); // small buffer for testing
  });

  it('should set, update, retrieve, and remove live user presence', () => {
    const mockPresence: LivePresence = {
      socketId: 'sock_123',
      userId: 'user_456',
      name: 'Aarav Kumar',
      email: 'aarav@kiet.edu',
      avatarUrl: null,
      college: 'KIET Group of Institutions',
      role: 'student',
      currentPath: '/dashboard',
      currentAction: 'Viewing Dashboard',
      deviceCategory: 'mobile',
      browserInfo: 'Chrome',
      connectedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
      isOnline: true,
      isIdle: false,
      sessionDurationSeconds: 0,
      timeline: [],
    };

    presenceStore.setPresence('sock_123', mockPresence);
    expect(presenceStore.getPresence('sock_123')).toBeDefined();
    expect(presenceStore.getPresence('sock_123')?.name).toBe('Aarav Kumar');

    // Update presence action
    presenceStore.updatePresence('sock_123', {
      currentPath: '/trips/new',
      currentAction: 'Drafting New Trip',
      isIdle: true,
    });

    const updated = presenceStore.getPresence('sock_123');
    expect(updated?.currentPath).toBe('/trips/new');
    expect(updated?.currentAction).toBe('Drafting New Trip');
    expect(updated?.isIdle).toBe(true);

    // List all
    const all = presenceStore.getAllPresence();
    expect(all.length).toBe(1);
    expect(all[0].userId).toBe('user_456');

    // Remove on disconnect (Active socket is removed, offline history retained with Went Offline status)
    presenceStore.removePresence('sock_123');
    expect(presenceStore.getPresence('sock_123')).toBeNull();
    const allAfterDisconnect = presenceStore.getAllPresence();
    expect(allAfterDisconnect.length).toBe(1);
    expect(allAfterDisconnect[0].isOnline).toBe(false);
    expect(allAfterDisconnect[0].currentAction).toContain('Disconnected');
    expect((allAfterDisconnect[0].timeline || []).length).toBeGreaterThan(0);
  });

  it('should record events and enforce maximum ring buffer capacity', async () => {
    for (let i = 1; i <= 15; i++) {
      await telemetryManager.recordEvent(
        `user_${i}`,
        `Student ${i}`,
        'SEARCH_PERFORMED',
        `Searched route #${i}`,
        { queryIndex: i }
      );
    }

    const recent = telemetryManager.getRecentEvents(50);
    // Enforces max buffer capacity of 10
    expect(recent.length).toBe(10);
    // Most recent event first
    expect(recent[0].description).toBe('Searched route #15');
    expect(recent[recent.length - 1].description).toBe('Searched route #6');
  });

  it('should label visitor sessions and scope numbering cleanly', async () => {
    const { VisitorTrackerStore, getDayLabel } = await import('../../src/lib/visitorTracker.js');
    const store = new VisitorTrackerStore();

    const v1 = store.recordPing(
      { sessionId: 'sess_1', currentPath: '/', currentAction: 'Viewing Home' },
      '127.0.0.1'
    );
    expect(v1.visitorNumber).toBe(1);
    expect(v1.visitorName).toBe('Visitor #1');
    expect(v1.dayLabel).toBe('Today');

    const v2 = store.recordPing(
      { sessionId: 'sess_2', currentPath: '/pricing', currentAction: 'Viewing Overview' },
      '127.0.0.1'
    );
    expect(v2.visitorNumber).toBe(2);
    expect(v2.visitorName).toBe('Visitor #2');

    // Test getDayLabel helper
    expect(getDayLabel(new Date().toISOString())).toBe('Today');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(getDayLabel(yesterday)).toBe('Yesterday');
  });
});
