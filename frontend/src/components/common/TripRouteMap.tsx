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
  Sparkles,
  MapPin,
  Clock,
  Globe,
  Crosshair,
  Loader2,
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

const TILE_LAYERS: Record<TileTheme, { url: string; attribution: string; name: string }> = {
  dark: {
    name: 'Midnight Dark',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  },
  light: {
    name: 'Clean Daylight',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
  },
};

const GOOGLE_DARK_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#14532d' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f1f5f9' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#6366f1' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#312e81' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
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
 * Creates custom styled HTML markers for Leaflet with pulsating animations
 */
function createCustomIcon(type: MapWaypoint['type'], sequenceNumber?: number): L.DivIcon {
  let bgColor = 'bg-emerald-500';
  let pulseClass = 'marker-pulse-emerald';
  let iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>`;
  let label = 'Origin';

  if (type === 'stop') {
    bgColor = 'bg-sky-500';
    pulseClass = 'marker-pulse-blue';
    iconSvg = `<span class="text-xs font-bold text-white font-mono">${sequenceNumber || 1}</span>`;
    label = `Stop ${sequenceNumber || 1}`;
  } else if (type === 'destination') {
    bgColor = 'bg-amber-500';
    pulseClass = '';
    iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" x2="4" y1="22" y2="15"/>
      </svg>`;
    label = 'Destination';
  }

  const html = `
    <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group">
      <div class="absolute w-8 h-8 rounded-full ${bgColor} opacity-40 ${pulseClass}"></div>
      <div class="relative flex items-center justify-center w-7 h-7 rounded-full ${bgColor} shadow-lg border-2 border-slate-900 z-10 transition-transform duration-200 group-hover:scale-125">
        ${iconSvg}
      </div>
      <div class="absolute -bottom-6 px-1.5 py-0.5 rounded bg-slate-900/90 text-[10px] font-medium text-slate-200 border border-slate-700/50 shadow whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
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
 * Helper hook to auto-fit map viewport to bounds of all waypoints
 */
const MapAutoFitController: React.FC<{ waypoints: MapWaypoint[]; routeCoords: [number, number][] }> = ({
  waypoints,
  routeCoords,
}) => {
  const map = useMap();

  useEffect(() => {
    if (waypoints.length === 0) return;

    if (routeCoords.length > 1) {
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
    } else if (waypoints.length === 1) {
      map.setView([waypoints[0].latitude, waypoints[0].longitude], 13, { animate: true });
    } else {
      const bounds = L.latLngBounds(waypoints.map((w) => [w.latitude, w.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
    }
  }, [waypoints, routeCoords, map]);

  return null;
};
/**
 * Helper hook to fly map to user's GPS position
 */
const UserLocationFlyToController: React.FC<{ userLocation: [number, number] | null }> = ({ userLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 15, { animate: true });
    }
  }, [userLocation, map]);

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
              scale: 8,
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

  // Render & Update Google Maps instance
  useEffect(() => {
    const win = window as any;
    if (engine !== 'google' || !isGoogleLoaded || !googleMapRef.current || !win.google?.maps) return;

    const validPoints = waypoints.filter(
      (w) => typeof w.latitude === 'number' && !isNaN(w.latitude) && typeof w.longitude === 'number' && !isNaN(w.longitude)
    );

    const initialCenter = validPoints.length > 0
      ? { lat: validPoints[0].latitude, lng: validPoints[0].longitude }
      : { lat: 28.6139, lng: 77.209 };

    if (!googleMapInstance.current) {
      googleMapInstance.current = new win.google.maps.Map(googleMapRef.current, {
        center: initialCenter,
        zoom: 12,
        disableDefaultUI: !interactive,
        zoomControl: interactive,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: tileTheme === 'dark' ? GOOGLE_DARK_STYLE : undefined,
        mapTypeId: tileTheme === 'satellite' ? win.google.maps.MapTypeId.HYBRID : win.google.maps.MapTypeId.ROADMAP,
      });
    } else {
      const map = googleMapInstance.current;
      map.setOptions({
        styles: tileTheme === 'dark' ? GOOGLE_DARK_STYLE : undefined,
        mapTypeId: tileTheme === 'satellite' ? win.google.maps.MapTypeId.HYBRID : win.google.maps.MapTypeId.ROADMAP,
      });
    }

    const map = googleMapInstance.current;

    // Clear previous markers
    googleMarkersRef.current.forEach((m) => m.setMap(null));
    googleMarkersRef.current = [];

    // Clear previous polylines
    googlePolylineRef.current.forEach((p) => p.setMap(null));
    googlePolylineRef.current = [];

    const bounds = new win.google.maps.LatLngBounds();

    // Add Google Markers
    validPoints.forEach((wp, idx) => {
      const pos = { lat: wp.latitude, lng: wp.longitude };
      bounds.extend(pos);

      const markerColor = wp.type === 'origin' ? '00e676' : wp.type === 'destination' ? 'ffb300' : '00b0ff';
      const markerLetter = wp.type === 'origin' ? 'A' : wp.type === 'destination' ? 'B' : `${wp.sequenceNumber || idx}`;

      const marker = new win.google.maps.Marker({
        position: pos,
        map,
        title: wp.name,
        label: {
          text: markerLetter,
          color: '#ffffff',
          fontWeight: 'bold',
        },
        icon: {
          url: `https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=${markerLetter}|${markerColor}|000000`,
          scaledSize: new win.google.maps.Size(26, 40),
        },
      });

      const infoWindow = new win.google.maps.InfoWindow({
        content: `<div style="color: #0f172a; padding: 4px;"><strong>${wp.name}</strong><br/><span style="font-size: 11px; text-transform: uppercase;">${wp.type}</span></div>`,
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
        strokeWeight: 4,
        map,
      });

      googlePolylineRef.current.push(outerGlow, coreRoute);

      path.forEach((pt) => bounds.extend(pt));
    }

    if (validPoints.length > 1 || (routeResult && routeResult.coordinates.length > 1)) {
      map.fitBounds(bounds);
    } else if (validPoints.length === 1) {
      map.setCenter({ lat: validPoints[0].latitude, lng: validPoints[0].longitude });
      map.setZoom(14);
    }
  }, [engine, isGoogleLoaded, waypoints, routeResult, tileTheme, interactive]);

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
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        {/* Engine Switcher (Google Maps vs OpenStreetMap) */}
        {googleApiKey && (
          <button
            type="button"
            onClick={() => setEngine(engine === 'google' ? 'leaflet' : 'google')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold shadow-lg backdrop-blur-md transition-all ${
              engine === 'google'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-900/90 text-slate-300 border-slate-700/60 hover:bg-slate-800'
            }`}
            title="Switch Map Provider"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{engine === 'google' ? 'Google Maps' : 'OpenStreetMap'}</span>
          </button>
        )}

        {/* Locate Me GPS Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold shadow-lg backdrop-blur-md transition-all ${
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

        {/* Tile Theme Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-700/60 shadow-lg backdrop-blur-md text-xs">
          <button
            type="button"
            onClick={() => setTileTheme('dark')}
            className={`px-2 py-1 rounded-lg transition-all ${
              tileTheme === 'dark' ? 'bg-indigo-600 text-white font-medium shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Dark Theme"
          >
            🌙 Dark
          </button>
          <button
            type="button"
            onClick={() => setTileTheme('light')}
            className={`px-2 py-1 rounded-lg transition-all ${
              tileTheme === 'light' ? 'bg-indigo-600 text-white font-medium shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Clean Daylight Theme"
          >
            ☀️ Light
          </button>
          <button
            type="button"
            onClick={() => setTileTheme('satellite')}
            className={`px-2 py-1 rounded-lg transition-all ${
              tileTheme === 'satellite' ? 'bg-indigo-600 text-white font-medium shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Satellite Imagery"
          >
            🛰️ Sat
          </button>
        </div>

        {/* Fullscreen Expand/Collapse */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg backdrop-blur-md transition-all"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Floating Route Statistics HUD */}
      {showStatsHud && routeResult && routeResult.distanceKm > 0 && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[1000] p-3 rounded-xl bg-slate-900/90 border border-slate-700/60 shadow-2xl backdrop-blur-md flex flex-wrap items-center gap-4 text-xs text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
      {engine === 'google' && googleApiKey && (
        <div ref={googleMapRef} className="w-full h-full min-h-[240px]" />
      )}

      {/* Render Fallback Leaflet Map Engine */}
      {(engine === 'leaflet' || !googleApiKey) && (
        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={interactive}
          dragging={interactive}
          doubleClickZoom={interactive}
          zoomControl={interactive}
          className="w-full h-full min-h-[240px]"
        >
          <TileLayer url={activeTile.url} attribution={activeTile.attribution} maxZoom={19} />

          <MapAutoFitController
            waypoints={waypoints}
            routeCoords={routeResult?.coordinates || []}
          />

          <UserLocationFlyToController userLocation={userLocation} />

          {/* User Live Location Beacon */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                className: 'user-gps-beacon',
                html: `
                  <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                    <div class="absolute w-8 h-8 rounded-full bg-sky-500 opacity-50 animate-ping"></div>
                    <div class="relative w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-md"></div>
                  </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
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
                  weight: 8,
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
      )}
    </div>
  );
};
