import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
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
  onMapClick?: (lat: number, lng: number) => void;
}

type TileTheme = 'dark' | 'light' | 'satellite';
type MapEngine = 'google' | 'leaflet';

// 100% Watermark-Free Tile Endpoints
const TILE_LAYERS: Record<TileTheme, { url: string; attribution: string; name: string; maxZoom: number; maxNativeZoom: number }> = {
  dark: {
    name: 'Midnight Dark',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    maxNativeZoom: 19,
  },
  light: {
    name: 'Clean Daylight',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
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
 * Generates an ultra-crisp 3D Ball-Head Pushpin SVG matching user reference:
 * Spherical glossy head + chrome needle stem + grounded shadow
 */
function getPushpinSvgString(type: MapWaypoint['type'], sequenceNumber?: number): string {
  let mainColor = '#10b981'; // Emerald Origin
  let darkShade = '#047857';
  let labelText = 'A';

  if (type === 'stop') {
    mainColor = '#0ea5e9'; // Sky Blue Stop
    darkShade = '#0369a1';
    labelText = `${sequenceNumber || 1}`;
  } else if (type === 'destination') {
    mainColor = '#ef4444'; // Glossy Crimson Red Destination
    darkShade = '#b91c1c';
    labelText = 'B';
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="50" viewBox="0 0 34 50">
      <defs>
        <!-- 3D Spherical Head Radial Highlight -->
        <radialGradient id="sphere-${type}-${sequenceNumber || 0}" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
          <stop offset="25%" stop-color="${mainColor}"/>
          <stop offset="80%" stop-color="${darkShade}"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </radialGradient>
        <!-- Chrome Needle Linear Gradient -->
        <linearGradient id="chromeStem" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#64748b"/>
          <stop offset="35%" stop-color="#f8fafc"/>
          <stop offset="70%" stop-color="#94a3b8"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
        <!-- Ground Drop Shadow -->
        <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Ground Contact Shadow -->
      <ellipse cx="17" cy="48" rx="8.5" ry="2.2" fill="url(#groundShadow)"/>

      <!-- Chrome Pin Needle Shaft -->
      <rect x="15.6" y="19" width="2.8" height="29" rx="1.4" fill="url(#chromeStem)" stroke="#334155" stroke-width="0.3"/>
      
      <!-- Chrome Base Collar -->
      <ellipse cx="17" cy="48" rx="2.5" ry="1" fill="#475569" stroke="#1e293b" stroke-width="0.3"/>

      <!-- 3D Spherical Ball Head -->
      <circle cx="17" cy="13" r="12" fill="url(#sphere-${type}-${sequenceNumber || 0})" stroke="rgba(0,0,0,0.3)" stroke-width="0.75"/>

      <!-- Pin Center Badge -->
      <text x="17" y="17" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle" style="filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.8));">${labelText}</text>
    </svg>
  `;
}

/**
 * Creates 3D Ball-Head Pushpin for Leaflet with proper anchor on the needle tip
 */
function createCustomIcon(type: MapWaypoint['type'], sequenceNumber?: number): L.DivIcon {
  const svg = getPushpinSvgString(type, sequenceNumber);
  const label = type === 'origin' ? 'Origin' : type === 'destination' ? 'Destination' : `Stop ${sequenceNumber || 1}`;

  const html = `
    <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full group cursor-pointer" style="width: 34px; height: 50px;">
      ${svg}
      <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-slate-900 text-[10px] font-semibold text-slate-100 border border-slate-700 shadow-md whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
        ${label}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-pushpin-marker',
    html,
    iconSize: [34, 50],
    iconAnchor: [17, 48], // Ground needle contact point
  });
}

/**
 * Creates 3D Ball-Head Pushpin for Google Maps
 */
function createGoogleMarkerIcon(type: MapWaypoint['type'], sequenceNumber?: number): any {
  const svg = getPushpinSvgString(type, sequenceNumber);
  const win = window as any;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: win.google?.maps ? new win.google.maps.Size(34, 50) : undefined,
    anchor: win.google?.maps ? new win.google.maps.Point(17, 48) : undefined,
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

/**
 * Map click handler to pick coordinates by clicking directly on map using stable ref
 */
const MapClickHandler: React.FC<{ onMapClickRef: React.MutableRefObject<((lat: number, lng: number) => void) | undefined> }> = ({ onMapClickRef }) => {
  useMapEvents({
    click(e) {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

export const TripRouteMap: React.FC<TripRouteMapProps> = ({
  waypoints,
  interactive = true,
  className = '',
  showStatsHud = true,
  onRouteCalculated,
  onMapClick,
}) => {
  const googleApiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '';
  
  const [engine, setEngine] = useState<MapEngine>(googleApiKey ? 'google' : 'leaflet');
  const [tileTheme, setTileTheme] = useState<TileTheme>('dark');
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
  const lastCalculatedRouteSignature = useRef<string>('');
  const onRouteCalculatedRef = useRef(onRouteCalculated);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onRouteCalculatedRef.current = onRouteCalculated;
  }, [onRouteCalculated]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

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

  // Compute road polyline with stable signature comparison to prevent infinite render loops
  useEffect(() => {
    const validPoints = waypoints.filter(
      (w) => typeof w.latitude === 'number' && !isNaN(w.latitude) && typeof w.longitude === 'number' && !isNaN(w.longitude)
    );

    const currentRouteSignature = validPoints
      .map((w) => `${w.latitude.toFixed(4)},${w.longitude.toFixed(4)}`)
      .join('|');

    if (validPoints.length < 2) {
      setRouteResult(null);
      lastCalculatedRouteSignature.current = '';
      return;
    }

    if (currentRouteSignature === lastCalculatedRouteSignature.current) {
      return; // Already calculated for these exact coordinates
    }

    lastCalculatedRouteSignature.current = currentRouteSignature;
    let isCancelled = false;
    setIsCalculatingRoute(true);

    computeRoadRoute(validPoints)
      .then((result) => {
        if (!isCancelled) {
          setRouteResult(result);
          if (onRouteCalculatedRef.current) {
            onRouteCalculatedRef.current(result);
          }
        }
      })
      .catch((err) => {
        console.warn('Route calculation error:', err);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsCalculatingRoute(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [waypoints]);

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
        zoomControlOptions: {
          position: win.google.maps.ControlPosition.RIGHT_BOTTOM,
        },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: interactive ? 'greedy' : 'none',
        styles: tileTheme === 'dark' ? GOOGLE_DARK_STYLE : [],
        mapTypeId: tileTheme === 'satellite' ? win.google.maps.MapTypeId.HYBRID : win.google.maps.MapTypeId.ROADMAP,
      });

      googleMapInstance.current.addListener('click', (e: any) => {
        if (e.latLng && onMapClickRef.current) {
          onMapClickRef.current(e.latLng.lat(), e.latLng.lng());
        }
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

    // Add 3D Ball Pushpin Markers
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
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: ${wp.type === 'origin' ? '#059669' : wp.type === 'destination' ? '#dc2626' : '#0284c7'};">
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
  }, [engine, isGoogleLoaded, waypoints, routeResult, tileTheme, interactive, onMapClick]);

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
        className || 'h-[440px] w-full'
      }`}
    >
      {/* Floating Map Controls Toolbar */}
      <div className="absolute top-2.5 inset-x-2.5 z-[1000] flex items-center justify-between gap-2 pointer-events-none">
        {/* Top-Left: High-Contrast Map Provider Switcher Button */}
        {googleApiKey ? (
          <button
            type="button"
            onClick={() => setEngine(engine === 'google' ? 'leaflet' : 'google')}
            className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold shadow-2xl backdrop-blur-md transition-all active:scale-95 ${
              engine === 'google'
                ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/50 hover:bg-slate-800'
                : 'bg-slate-900/95 text-sky-400 border-sky-500/50 hover:bg-slate-800'
            }`}
            title="Switch Map Provider"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="truncate">{engine === 'google' ? 'Google Maps' : 'OpenStreetMap'}</span>
          </button>
        ) : (
          <div />
        )}

        {/* Top-Right: Locate Me & Compact Theme Switcher */}
        <div className="flex items-center gap-1.5">
          {/* Locate Me GPS Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className={`pointer-events-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold shadow-2xl backdrop-blur-md transition-all active:scale-95 ${
              userLocation
                ? 'bg-slate-900/95 text-sky-300 border-sky-500/50 hover:bg-slate-800'
                : 'bg-slate-900/95 text-slate-200 border-slate-700/80 hover:bg-slate-800'
            }`}
            title="Center map on my live GPS Location"
          >
            {isLocating ? (
              <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
            ) : (
              <Crosshair className="w-3 h-3 text-sky-400" />
            )}
            <span className="hidden sm:inline">Locate</span>
          </button>

          {/* Clean Theme Segmented Control */}
          <div className="pointer-events-auto flex items-center p-0.5 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-[11px] gap-0.5">
            <button
              type="button"
              onClick={() => setTileTheme('dark')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all ${
                tileTheme === 'dark'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Dark Theme"
            >
              <Moon className="w-3 h-3" />
              <span className="hidden xs:inline">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setTileTheme('light')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all ${
                tileTheme === 'light'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Clean Daylight Theme"
            >
              <Sun className="w-3 h-3" />
              <span className="hidden xs:inline">Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTileTheme('satellite')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all ${
                tileTheme === 'satellite'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Satellite Imagery"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden xs:inline">Sat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Route Statistics HUD */}
      {showStatsHud && routeResult && routeResult.distanceKm > 0 && (
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto z-[1000] p-2.5 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md flex flex-wrap items-center gap-3 text-xs text-slate-200">
          <div className="flex items-center gap-1.5 font-medium text-emerald-400">
            <Navigation className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm font-semibold text-slate-100">{routeResult.distanceKm} km</span>
            <span className="text-slate-400 text-[10px]">Road Distance</span>
          </div>

          <div className="h-3.5 w-px bg-slate-700/60 hidden sm:block" />

          <div className="flex items-center gap-1.5 font-medium text-sky-400">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm font-semibold text-slate-100">{routeResult.formattedDuration}</span>
            <span className="text-slate-400 text-[10px]">Est. Travel Time</span>
          </div>

          {waypoints.length > 2 && (
            <>
              <div className="h-3.5 w-px bg-slate-700/60 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-indigo-400">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold text-slate-100">{waypoints.length - 2}</span>
                <span className="text-slate-400 text-[10px]">Stops</span>
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
          className={`w-full h-full min-h-[320px] ${engine === 'google' ? 'block' : 'hidden'}`}
        />
      )}

      {/* Render Fallback Leaflet Map Engine */}
      <div className={`w-full h-full min-h-[320px] ${engine === 'leaflet' || !googleApiKey ? 'block' : 'hidden'}`}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={interactive}
          dragging={interactive}
          touchZoom={interactive}
          doubleClickZoom={interactive}
          zoomControl={false}
          className={`w-full h-full min-h-[320px] ${tileTheme === 'dark' ? 'leaflet-dark-tiles' : ''}`}
        >
          <TileLayer
            key={`${tileTheme}-${activeTile.url}`}
            url={activeTile.url}
            attribution={activeTile.attribution}
            maxZoom={activeTile.maxZoom}
            maxNativeZoom={activeTile.maxNativeZoom}
          />

          {/* Place Leaflet Zoom Control at Bottom Right so it never overlaps top toolbar */}
          {interactive && <ZoomControl position="bottomright" />}

          <LeafletResizeHandler isVisible={engine === 'leaflet' || !googleApiKey} />

          <SmartMapAutoFitController
            waypoints={waypoints}
            routeCoords={routeResult?.coordinates || []}
          />

          <MapClickHandler onMapClickRef={onMapClickRef} />

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
                            ? 'bg-red-500/20 text-red-400'
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
