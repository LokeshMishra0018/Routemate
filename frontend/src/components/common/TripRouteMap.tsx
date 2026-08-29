import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Maximize2,
  Minimize2,
  Navigation,
  MapPin,
  Clock,
  Globe,
  Crosshair,
  Loader2,
  Moon,
  Sun,
  Layers,
} from 'lucide-react';
import { computeRoadRoute, RouteCalculationResult } from '../../services/routing.service';

export interface MapWaypoint {
  name: string;
  latitude: number;
  longitude: number;
  type: 'origin' | 'stop' | 'destination';
  sequenceNumber?: number;
  info?: string;
}

export interface TripRouteMapProps {
  waypoints: MapWaypoint[];
  interactive?: boolean;
  className?: string;
  showStatsHud?: boolean;
  onRouteCalculated?: (result: RouteCalculationResult) => void;
}

type TileTheme = 'dark' | 'light' | 'satellite';
type MapEngine = 'google' | 'leaflet';

const TILE_LAYERS: Record<TileTheme, { url: string; attribution: string; name: string; maxZoom?: number; maxNativeZoom?: number }> = {
  dark: {
    name: 'Midnight Dark',
    url: 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
    maxNativeZoom: 19,
  },
  light: {
    name: 'Clean Daylight',
    url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
    maxNativeZoom: 19,
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
    maxZoom: 19,
    maxNativeZoom: 18,
  },
};

// Luxury Apple Maps / Uber Midnight Navy Palette for Google Maps
const GOOGLE_DARK_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#0b1120' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }, { weight: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334155' }, { weight: 1 }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e2e8f0' }, { weight: 600 }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#064e3b' }, { opacity: 0.6 }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#34d399' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f172a' }, { weight: 1 }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }, { weight: 1.5 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f8fafc' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#030712' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
];

/**
 * Dynamically loads Google Maps JavaScript SDK
 */
function loadGoogleMapsScript(apiKey: string): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  const win = window as any;
  if (win.google?.maps) {
    return Promise.resolve(win.google);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-sdk-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(win.google));
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-sdk-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,routes,marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(win.google);
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Creates rock-solid, non-blinking custom styled HTML markers for Leaflet
 */
function createCustomIcon(type: MapWaypoint['type'], sequenceNumber?: number): L.DivIcon {
  let bgColor = 'bg-emerald-500';
  let badgeBorder = 'border-emerald-300/60';
  let iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>`;
  let label = 'Origin';

  if (type === 'stop') {
    bgColor = 'bg-sky-500';
    badgeBorder = 'border-sky-300/60';
    iconSvg = `<span class="text-xs font-bold text-white font-mono leading-none">${sequenceNumber || 1}</span>`;
    label = `Stop ${sequenceNumber || 1}`;
  } else if (type === 'destination') {
    bgColor = 'bg-amber-500';
    badgeBorder = 'border-amber-300/60';
    iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" x2="4" y1="22" y2="15"/>
      </svg>`;
    label = 'Destination';
  }

  const html = `
    <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
      <div class="flex items-center justify-center w-7 h-7 rounded-full ${bgColor} shadow-lg border-2 ${badgeBorder} z-10 transition-transform duration-150 group-hover:scale-115">
        ${iconSvg}
      </div>
      <div class="absolute -bottom-6 px-1.5 py-0.5 rounded bg-slate-900 text-[10px] font-semibold text-slate-100 border border-slate-700 shadow-md whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
        ${label}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/**
 * Creates rock-solid custom SVG Pin for Google Maps
 */
function createGoogleMarkerIcon(type: MapWaypoint['type'], sequenceNumber?: number): any {
  const fillColor = type === 'origin' ? '#10b981' : type === 'destination' ? '#f59e0b' : '#0ea5e9';
  const labelText = type === 'origin' ? 'A' : type === 'destination' ? 'B' : `${sequenceNumber || 1}`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">
      <defs>
        <filter id="pin-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M15 0C6.71 0 0 6.71 0 15c0 11.25 15 23 15 23s15-11.75 15-23C30 6.71 23.29 0 15 0z" fill="${fillColor}" stroke="#0f172a" stroke-width="1.5" filter="url(#pin-shadow)"/>
      <circle cx="15" cy="14" r="8" fill="#0f172a"/>
      <text x="15" y="18" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">${labelText}</text>
    </svg>
  `;

  const win = window as any;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: win.google?.maps ? new win.google.maps.Size(30, 38) : undefined,
    anchor: win.google?.maps ? new win.google.maps.Point(15, 38) : undefined,
  };
}

/**
 * Smart Camera Auto-Fit Hook for Leaflet that ONLY fits bounds ONCE per route change
 * Prevents camera freeze so users have 100% free drag, pan, and zoom!
 */
const SmartMapAutoFitController: React.FC<{
  waypoints: MapWaypoint[];
  routeCoords: [number, number][];
}> = ({ waypoints, routeCoords }) => {
  const map = useMap();
  const lastFittedSignature = useRef<string>('');

  useEffect(() => {
    if (waypoints.length === 0) return;

    // Create a unique coordinate signature for origin + stops + destination
    const currentSignature = waypoints
      .filter((w) => typeof w.latitude === 'number' && !isNaN(w.latitude))
      .map((w) => `${w.latitude.toFixed(4)},${w.longitude.toFixed(4)}`)
      .join('|');

    if (!currentSignature || currentSignature === lastFittedSignature.current) {
      return; // Already framed, do NOT override user dragging/zooming!
    }

    lastFittedSignature.current = currentSignature;

    if (routeCoords.length > 1) {
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    } else if (waypoints.length === 1 && waypoints[0].latitude) {
      map.setView([waypoints[0].latitude, waypoints[0].longitude], 13, { animate: true });
    } else if (waypoints.length > 1) {
      const bounds = L.latLngBounds(waypoints.map((w) => [w.latitude, w.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
    }
  }, [waypoints, routeCoords, map]);

  return null;
};

/**
 * Helper hook to force Leaflet viewport recalculation on visibility change
 */
const LeafletResizeHandler: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  const map = useMap();

  useEffect(() => {
    if (isVisible) {
      const t1 = setTimeout(() => map.invalidateSize(), 50);
      const t2 = setTimeout(() => map.invalidateSize(), 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isVisible, map]);

  return null;
};

export const TripRouteMap: React.FC<TripRouteMapProps> = ({
  waypoints,
  interactive = true,
  className = '',
  showStatsHud = true,
  onRouteCalculated,
}) => {
  const googleApiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '';
  
  const [engine, setEngine] = useState<MapEngine>(googleApiKey ? 'google' : 'leaflet');
  const [tileTheme, setTileTheme] = useState<TileTheme>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteCalculationResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const googleMapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const googlePolylineRef = useRef<any[]>([]);
  const googleUserMarkerRef = useRef<any>(null);
  const googleLastFittedSignature = useRef<string>('');

  // Initialize Google Maps API Loader if Key is Present
  useEffect(() => {
    if (!googleApiKey || engine !== 'google') return;

    let isMounted = true;
    loadGoogleMapsScript(googleApiKey)
      .then(() => {
        if (isMounted) {
          setIsGoogleLoaded(true);
        }
      })
      .catch((err) => {
        console.warn('Google Maps API failed to load, falling back to Leaflet OSM:', err);
        if (isMounted) {
          setEngine('leaflet');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [googleApiKey, engine]);

  // Compute road polyline whenever waypoints change
  useEffect(() => {
    let isCancelled = false;

    async function fetchRoute() {
      const validPoints = waypoints.filter(
        (w) => typeof w.latitude === 'number' && !isNaN(w.latitude) && typeof w.longitude === 'number' && !isNaN(w.longitude)
      );

      if (validPoints.length >= 2) {
        setIsCalculatingRoute(true);
        try {
          const result = await computeRoadRoute(validPoints);
          if (!isCancelled) {
            setRouteResult(result);
            if (onRouteCalculated) {
              onRouteCalculated(result);
            }
          }
        } finally {
          if (!isCancelled) setIsCalculatingRoute(false);
        }
      } else {
        setRouteResult(null);
      }
    }

    fetchRoute();
    return () => {
      isCancelled = true;
    };
  }, [waypoints, onRouteCalculated]);

  // Render & Update Google Maps instance with Instant Theme Switching & Single-Shot Auto-Fit
  useEffect(() => {
    const win = window as any;
    if (engine !== 'google' || !isGoogleLoaded || !googleMapRef.current || !win.google?.maps) return;

    const validPoints = waypoints.filter(
      (w) => typeof w.latitude === 'number' && !isNaN(w.latitude) && typeof w.longitude === 'number' && !isNaN(w.longitude)
    );

    const initialCenter = validPoints.length > 0
      ? { lat: validPoints[0].latitude, lng: validPoints[0].longitude }
      : { lat: 28.6139, lng: 77.209 };

    if (!googleMapInstance.current || !googleMapRef.current.hasChildNodes()) {
      googleMapInstance.current = new win.google.maps.Map(googleMapRef.current, {
        center: initialCenter,
        zoom: 12,
        disableDefaultUI: !interactive,
        zoomControl: interactive,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: interactive ? 'greedy' : 'none',
        styles: tileTheme === 'dark' ? GOOGLE_DARK_STYLE : [],
        mapTypeId: tileTheme === 'satellite' ? win.google.maps.MapTypeId.HYBRID : win.google.maps.MapTypeId.ROADMAP,
      });
    } else {
      const map = googleMapInstance.current;
      map.setOptions({
        styles: tileTheme === 'dark' ? GOOGLE_DARK_STYLE : [],
        mapTypeId: tileTheme === 'satellite' ? win.google.maps.MapTypeId.HYBRID : win.google.maps.MapTypeId.ROADMAP,
        gestureHandling: interactive ? 'greedy' : 'none',
      });
      win.google.maps.event.trigger(map, 'resize');
    }

    const map = googleMapInstance.current;

    // Clear previous markers
    googleMarkersRef.current.forEach((m) => m.setMap(null));
    googleMarkersRef.current = [];

    // Clear previous polylines
    googlePolylineRef.current.forEach((p) => p.setMap(null));
    googlePolylineRef.current = [];

    const bounds = new win.google.maps.LatLngBounds();

    // Add Solid Custom Google SVG Markers (No flickering/drop animations)
    validPoints.forEach((wp) => {
      const pos = { lat: wp.latitude, lng: wp.longitude };
      bounds.extend(pos);

      const marker = new win.google.maps.Marker({
        position: pos,
        map,
        title: wp.name,
        icon: createGoogleMarkerIcon(wp.type, wp.sequenceNumber),
      });

      const infoWindow = new win.google.maps.InfoWindow({
        content: `
          <div style="color: #0f172a; padding: 4px; font-family: system-ui, sans-serif;">
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: ${wp.type === 'origin' ? '#059669' : wp.type === 'destination' ? '#d97706' : '#0284c7'};">
              ${wp.type === 'stop' ? `Stop #${wp.sequenceNumber}` : wp.type}
            </span>
            <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">${wp.name}</div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      googleMarkersRef.current.push(marker);
    });

    // Draw Google Road Polyline
    if (routeResult && routeResult.coordinates.length > 1) {
      const path = routeResult.coordinates.map(([lat, lng]) => ({ lat, lng }));

      // Outer glow line
      const outerGlow = new win.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#6366f1',
        strokeOpacity: 0.4,
        strokeWeight: 8,
        map,
      });

      // Core route line
      const coreRoute = new win.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#38bdf8',
        strokeOpacity: 0.95,
        strokeWeight: 4.5,
        map,
      });

      googlePolylineRef.current.push(outerGlow, coreRoute);

      path.forEach((pt) => bounds.extend(pt));
    }

    // Smart Camera Framing: Only fit bounds ONCE per route change
    const signature = validPoints.map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`).join('|');
    if (signature && signature !== googleLastFittedSignature.current) {
      googleLastFittedSignature.current = signature;

      setTimeout(() => {
        if (validPoints.length > 1 || (routeResult && routeResult.coordinates.length > 1)) {
          map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
        } else if (validPoints.length === 1) {
          map.setCenter({ lat: validPoints[0].latitude, lng: validPoints[0].longitude });
          map.setZoom(14);
        }
        win.google.maps.event.trigger(map, 'resize');
      }, 60);
    }
  }, [engine, isGoogleLoaded, waypoints, routeResult, tileTheme, interactive]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation([lat, lng]);
        setIsLocating(false);

        if (engine === 'google' && googleMapInstance.current) {
          const win = window as any;
          googleMapInstance.current.setCenter({ lat, lng });
          googleMapInstance.current.setZoom(15);

          if (googleUserMarkerRef.current) {
            googleUserMarkerRef.current.setMap(null);
          }

          googleUserMarkerRef.current = new win.google.maps.Marker({
            position: { lat, lng },
            map: googleMapInstance.current,
            title: 'Your Location',
            icon: {
              path: win.google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#38bdf8',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        alert('Could not access your location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const defaultCenter: [number, number] = useMemo(() => {
    if (waypoints.length > 0 && waypoints[0].latitude) {
      return [waypoints[0].latitude, waypoints[0].longitude];
    }
    return [28.6139, 77.209];
  }, [waypoints]);

  const activeTile = TILE_LAYERS[tileTheme];

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-950 flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : className || 'h-96 w-full'
      }`}
    >
      {/* Floating Map Controls Toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 pointer-events-none">
        {/* Engine Switcher (Google Maps vs OpenStreetMap) */}
        {googleApiKey && (
          <button
            type="button"
            onClick={() => setEngine(engine === 'google' ? 'leaflet' : 'google')}
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xl backdrop-blur-md transition-all active:scale-95 ${
              engine === 'google'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-900/90 text-slate-300 border-slate-700/60 hover:bg-slate-800'
            }`}
            title="Switch Map Provider"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{engine === 'google' ? 'Google Maps' : 'OpenStreetMap'}</span>
          </button>
        )}

        {/* Locate Me GPS Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xl backdrop-blur-md transition-all active:scale-95 ${
            userLocation
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
              : 'bg-slate-900/90 text-slate-300 border-slate-700/60 hover:bg-slate-800'
          }`}
          title="Center map on my live GPS Location"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
          ) : (
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
          )}
          <span className="hidden sm:inline">Locate Me</span>
        </button>

        {/* Clean Theme Segmented Control */}
        <div className="pointer-events-auto flex items-center p-1 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs gap-0.5">
          <button
            type="button"
            onClick={() => setTileTheme('dark')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              tileTheme === 'dark'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Dark Theme"
          >
            <Moon className="w-3 h-3" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => setTileTheme('light')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              tileTheme === 'light'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Clean Daylight Theme"
          >
            <Sun className="w-3 h-3" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => setTileTheme('satellite')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              tileTheme === 'satellite'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Satellite Imagery"
          >
            <Layers className="w-3 h-3" />
            <span>Sat</span>
          </button>
        </div>

        {/* Fullscreen Expand/Collapse */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="pointer-events-auto p-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-xl backdrop-blur-md transition-all active:scale-95"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Floating Route Statistics HUD */}
      {showStatsHud && routeResult && routeResult.distanceKm > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 sm:right-auto z-[1000] p-3 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md flex flex-wrap items-center gap-4 text-xs text-slate-200">
          <div className="flex items-center gap-1.5 font-medium text-emerald-400">
            <Navigation className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold text-slate-100">{routeResult.distanceKm} km</span>
            <span className="text-slate-400 text-[10px]">Road Distance</span>
          </div>

          <div className="h-4 w-px bg-slate-700/60 hidden sm:block" />

          <div className="flex items-center gap-1.5 font-medium text-sky-400">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold text-slate-100">{routeResult.formattedDuration}</span>
            <span className="text-slate-400 text-[10px]">Est. Travel Time</span>
          </div>

          {waypoints.length > 2 && (
            <>
              <div className="h-4 w-px bg-slate-700/60 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-indigo-400">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="font-semibold text-slate-100">{waypoints.length - 2}</span>
                <span className="text-slate-400 text-[10px]">Intermediate Stops</span>
              </div>
            </>
          )}

          {isCalculatingRoute && (
            <span className="text-[10px] text-amber-400 animate-pulse ml-auto">Updating road route...</span>
          )}
        </div>
      )}

      {/* Render Google Maps Engine */}
      {googleApiKey && (
        <div
          ref={googleMapRef}
          className={`w-full h-full min-h-[240px] ${engine === 'google' ? 'block' : 'hidden'}`}
        />
      )}

      {/* Render Fallback Leaflet Map Engine */}
      <div className={`w-full h-full min-h-[240px] ${engine === 'leaflet' || !googleApiKey ? 'block' : 'hidden'}`}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={interactive}
          dragging={interactive}
          touchZoom={interactive}
          doubleClickZoom={interactive}
          zoomControl={interactive}
          className="w-full h-full min-h-[240px]"
        >
          <TileLayer
            key={`${tileTheme}-${activeTile.url}`}
            url={activeTile.url}
            attribution={activeTile.attribution}
            maxZoom={activeTile.maxZoom || 19}
            maxNativeZoom={activeTile.maxNativeZoom || 19}
          />

          <LeafletResizeHandler isVisible={engine === 'leaflet' || !googleApiKey} />

          <SmartMapAutoFitController
            waypoints={waypoints}
            routeCoords={routeResult?.coordinates || []}
          />

          {/* User Live Location Beacon */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                className: 'user-gps-beacon',
                html: `
                  <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                    <div class="w-3.5 h-3.5 rounded-full bg-sky-400 border-2 border-white shadow-md user-gps-dot"></div>
                  </div>
                `,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            >
              <Popup>
                <div className="p-1 text-xs text-slate-100 font-semibold">📍 You are here (Live GPS)</div>
              </Popup>
            </Marker>
          )}

          {/* Render Road Polyline with Glowing Effect */}
          {routeResult && routeResult.coordinates.length > 1 && (
            <>
              {/* Outer Glow Line */}
              <Polyline
                positions={routeResult.coordinates}
                pathOptions={{
                  color: '#6366f1',
                  weight: 7,
                  opacity: 0.35,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Core Highway Line */}
              <Polyline
                positions={routeResult.coordinates}
                pathOptions={{
                  color: '#38bdf8',
                  weight: 4,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
          )}

          {/* Render Markers for Origin, Intermediate Stops, and Destination */}
          {waypoints.map((wp, index) => {
            if (!wp.latitude || !wp.longitude) return null;

            return (
              <Marker
                key={`${wp.type}-${index}-${wp.latitude}-${wp.longitude}`}
                position={[wp.latitude, wp.longitude]}
                icon={createCustomIcon(wp.type, wp.sequenceNumber)}
              >
                <Popup>
                  <div className="p-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          wp.type === 'origin'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : wp.type === 'destination'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-sky-500/20 text-sky-400'
                        }`}
                      >
                        {wp.type === 'stop' ? `Stop #${wp.sequenceNumber || index}` : wp.type}
                      </span>
                      <h4 className="text-xs font-bold text-slate-100">{wp.name}</h4>
                    </div>
                    {wp.info && <p className="text-[11px] text-slate-300">{wp.info}</p>}
                    <p className="text-[10px] text-slate-400 font-mono">
                      {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
