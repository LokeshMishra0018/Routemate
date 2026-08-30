import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../services/api.client';

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem('routemate_vid');
    if (!sid) {
      sid = `v_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem('routemate_vid', sid);
    }
    return sid;
  } catch {
    return `v_${Date.now().toString(36)}`;
  }
}

function getAcquisitionSource(): string {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source') || urlParams.get('ref') || urlParams.get('source');
    if (utmSource) {
      if (utmSource.toLowerCase().includes('whatsapp')) return 'WhatsApp Campus Broadcast';
      if (utmSource.toLowerCase().includes('insta')) return 'Instagram Link';
      if (utmSource.toLowerCase().includes('qr') || utmSource.toLowerCase().includes('poster')) return 'Campus QR Poster';
      return `Campaign: ${utmSource}`;
    }

    const ref = document.referrer;
    if (!ref) return 'Direct / Campus Link';
    if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'WhatsApp Web/Mobile';
    if (ref.includes('instagram.com')) return 'Instagram';
    if (ref.includes('google.')) return 'Google Search';
    if (ref.includes('linkedin.com')) return 'LinkedIn';
    if (ref.includes('t.co') || ref.includes('twitter.com') || ref.includes('x.com')) return 'Twitter / X';
    if (ref.includes('youtube.com')) return 'YouTube';
    return new URL(ref).hostname;
  } catch {
    return 'Direct Link';
  }
}

function getDeviceCategory(): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) return 'Chrome';
  if (/edg/i.test(ua)) return 'Edge';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return 'Browser';
}

function getBackendPingUrl(): string {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api/v1';
  return `${envUrl.replace(/\/$/, '')}/telemetry/visitor-ping`;
}

function sendVisitorPing(
  payload: {
    currentPath: string;
    currentAction: string;
    currentSection?: string;
  },
  isLeaving: boolean = false
) {
  try {
    const sessionId = getSessionId();
    const referrer = getAcquisitionSource();
    const deviceCategory = getDeviceCategory();
    const browserInfo = getBrowserInfo();
    const screenResolution = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Responsive';
    const language = typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en';

    const fullPayload = {
      sessionId,
      ...payload,
      referrer,
      deviceCategory,
      browserInfo,
      screenResolution,
      language,
      isLeaving,
    };

    const targetUrl = getBackendPingUrl();

    // If leaving the site on tab close, use beacon or keepalive for guaranteed zero-delay delivery
    if (isLeaving) {
      const blob = new Blob([JSON.stringify(fullPayload)], { type: 'application/json' });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(targetUrl, blob);
        return;
      }
      if (typeof fetch !== 'undefined') {
        fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullPayload),
          keepalive: true,
        }).catch(() => {});
        return;
      }
    }

    // Normal active ping via apiClient
    apiClient.post('/telemetry/visitor-ping', fullPayload).catch(() => {});
  } catch {
    // Fail completely silently
  }
}

/**
 * Invisible, zero-permission telemetry hook for overview & public pages.
 * Pings every 8 seconds while visible and detects instant tab-close exits.
 */
export function useVisitorTracker(pageName: string = 'Overview Page') {
  const location = useLocation();
  const lastSectionRef = useRef<string>('Hero Section');

  useEffect(() => {
    // 1. Initial page landing ping
    sendVisitorPing({
      currentPath: location.pathname,
      currentAction: `Landed on ${pageName}`,
      currentSection: 'Hero Banner',
    });

    // 2. Set up IntersectionObserver on landing page sections
    const sectionMap: Record<string, string> = {
      modes: 'Exploring Multi-Modal Commutes (Metro, Train, Cab, Bus)',
      badges: 'Reviewing 4-Tier Student Trust Badges',
      'safety-proof': 'Inspecting Digital Safety Proof & Audit Logs',
      features: 'Reading Campus Mobility Feature Matrix',
      calculator: 'Testing Fair Fare & Carbon Savings Calculator',
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const id = entry.target.id;
            const actionText = sectionMap[id] || `Viewing Section #${id}`;
            if (lastSectionRef.current !== id) {
              lastSectionRef.current = id;
              sendVisitorPing({
                currentPath: location.pathname,
                currentAction: actionText,
                currentSection: id,
              });
            }
          }
        });
      },
      { threshold: [0.3] }
    );

    Object.keys(sectionMap).forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    // 3. 8-Second Keepalive heartbeat while active
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendVisitorPing({
          currentPath: location.pathname,
          currentAction: `Active in ${lastSectionRef.current || pageName}`,
          currentSection: lastSectionRef.current,
        });
      }
    }, 8000);

    // 4. Instant Tab Close & App Switch Exit Detection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendVisitorPing(
          {
            currentPath: location.pathname,
            currentAction: 'Left Tab / App Switched',
            currentSection: lastSectionRef.current,
          },
          true
        );
      } else if (document.visibilityState === 'visible') {
        sendVisitorPing({
          currentPath: location.pathname,
          currentAction: `Returned to ${lastSectionRef.current || pageName}`,
          currentSection: lastSectionRef.current,
        });
      }
    };

    const handlePageHide = () => {
      sendVisitorPing(
        {
          currentPath: location.pathname,
          currentAction: 'Closed Page',
          currentSection: lastSectionRef.current,
        },
        true
      );
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      // Fire final leave beacon on unmount
      sendVisitorPing(
        {
          currentPath: location.pathname,
          currentAction: 'Navigated Away',
          currentSection: lastSectionRef.current,
        },
        true
      );
    };
  }, [location.pathname, pageName]);
}
