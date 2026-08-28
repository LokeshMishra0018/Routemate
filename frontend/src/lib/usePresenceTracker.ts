import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

function getActionFromPath(pathname: string): string {
  if (pathname === '/dashboard') return 'Viewing Dashboard';
  if (pathname === '/trips/new') return 'Drafting New Trip';
  if (pathname.startsWith('/trips/')) return 'Viewing Trip Details';
  if (pathname === '/trips') return 'Browsing Campus Trips';
  if (pathname === '/matches') return 'Exploring Commute Matches';
  if (pathname === '/connections') return 'Viewing Travel Network';
  if (pathname.startsWith('/messages')) return 'Active in Chat';
  if (pathname.startsWith('/groups/')) return 'Viewing Commute Circle';
  if (pathname === '/groups') return 'Browsing Commute Circles';
  if (pathname === '/verification') return 'Student ID Verification';
  if (pathname === '/safety') return 'Viewing Safety & SOS Hub';
  if (pathname === '/notifications') return 'Viewing Notifications';
  if (pathname.startsWith('/profile')) return 'Viewing Student Profile';
  if (pathname.startsWith('/admin/live')) return 'Admin: Live Telemetry Radar';
  if (pathname.startsWith('/admin/trips')) return 'Admin: Trips Master Dispatch';
  if (pathname.startsWith('/admin/users-funnel')) return 'Admin: Funnels & Retention';
  if (pathname.startsWith('/admin/demand')) return 'Admin: Search Demand Radar';
  if (pathname.startsWith('/admin/system')) return 'Admin: System Telemetry';
  if (pathname.startsWith('/admin')) return 'Admin: Moderation Command Center';
  return 'Browsing RouteMate';
}

function getDeviceCategory(): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  if (/edge/i.test(ua)) return 'Edge';
  return 'Browser';
}

/**
 * Global background presence hook that streams real-time path, readable action,
 * and idle telemetry to the backend Socket.IO gateway.
 */
export function usePresenceTracker() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const location = useLocation();
  const [isIdle, setIsIdle] = useState(false);
  const lastActivityRef = useRef(Date.now());

  // Detect user idle after 2 minutes of inactivity
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (isIdle) {
        setIsIdle(false);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const idleChecker = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 120000) {
        setIsIdle(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(idleChecker);
    };
  }, [isIdle]);

  // Send heartbeat on location changes & periodically every 15s
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const sendHeartbeat = () => {
      socket.emit('presence:heartbeat', {
        currentPath: location.pathname,
        currentAction: getActionFromPath(location.pathname),
        isIdle,
        deviceCategory: getDeviceCategory(),
        browserInfo: getBrowserInfo(),
      });
    };

    // Immediate update on route navigation
    sendHeartbeat();

    // Periodic heartbeat
    const interval = setInterval(sendHeartbeat, 15000);
    return () => clearInterval(interval);
  }, [socket, isConnected, user, location.pathname, isIdle]);
}
