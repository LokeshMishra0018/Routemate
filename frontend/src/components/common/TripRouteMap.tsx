import React, { useEffect, useState, useMemo } from 'react';
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
  Layers,
  Sparkles,
  MapPin,
  Clock,
  Car,
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

const TILE_LAYERS: Record<TileTheme, { url: string; attribution: string; name: string }> = {
  dark: {
    name: 'Midnight Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
  },
  light: {
    name: 'Clean Daylight',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
  },
};

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

export const TripRouteMap: React.FC<TripRouteMapProps> = ({
  waypoints,
  interactive = true,
  className = '',
  showStatsHud = true,
  onRouteCalculated,
}) => {
  const [tileTheme, setTileTheme] = useState<TileTheme>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteCalculationResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Default fallback center: NCR / Delhi coordinates
  const defaultCenter: [number, number] = useMemo(() => {
    if (waypoints.length > 0 && waypoints[0].latitude) {
      return [waypoints[0].latitude, waypoints[0].longitude];
    }
    return [28.6139, 77.209];
  }, [waypoints]);

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

  const activeTile = TILE_LAYERS[tileTheme];

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-950 flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : className || 'h-96 w-full'
      }`}
    >
      {/* Floating Map Controls Toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        {/* Tile Theme Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-700/60 shadow-lg backdrop-blur-md text-xs">
          <button
            type="button"
            onClick={() => setTileTheme('dark')}
            className={`px-2 py-1 rounded-lg transition-all ${
              tileTheme === 'dark' ? 'bg-indigo-600 text-white font-medium shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Dark Matter Theme"
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

      {/* Main Leaflet Map Engine */}
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
    </div>
  );
};
