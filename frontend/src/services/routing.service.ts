/**
 * Road Routing & Distance Calculation Service
 * Uses Open Source Routing Machine (OSRM) driving API with Turf.js / Haversine fallback
 */

export interface RoutePoint {
  name?: string;
  latitude: number;
  longitude: number;
}

export interface RouteCalculationResult {
  coordinates: [number, number][]; // [lat, lng] array formatted for Leaflet
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  formattedDuration: string;
  isFallback: boolean;
}

/**
 * Format duration seconds into a human-friendly string (e.g., "45 mins", "1 hr 20 mins")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMins} min`;
}

/**
 * Haversine distance formula between two lat/lng coordinates in kilometers
 */
export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Compute the full turn-by-turn road route across waypoints using OSRM
 */
export async function computeRoadRoute(waypoints: RoutePoint[]): Promise<RouteCalculationResult> {
  const validWaypoints = waypoints.filter(
    (w) => typeof w.latitude === 'number' && !isNaN(w.latitude) && typeof w.longitude === 'number' && !isNaN(w.longitude)
  );

  if (validWaypoints.length < 2) {
    return {
      coordinates: validWaypoints.map((w) => [w.latitude, w.longitude]),
      distanceMeters: 0,
      distanceKm: 0,
      durationSeconds: 0,
      formattedDuration: '0 min',
      isFallback: true,
    };
  }

  // Build OSRM query string: lon,lat;lon,lat;...
  const coordString = validWaypoints.map((w) => `${w.longitude},${w.latitude}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`OSRM routing HTTP error ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const bestRoute = data.routes[0];
      // OSRM returns GeoJSON coordinates as [lon, lat]. Leaflet Polyline expects [lat, lon].
      const polylineCoords: [number, number][] = bestRoute.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );

      const distanceMeters = bestRoute.distance || 0;
      const distanceKm = Number((distanceMeters / 1000).toFixed(1));
      const durationSeconds = bestRoute.duration || 0;

      return {
        coordinates: polylineCoords,
        distanceMeters,
        distanceKm,
        durationSeconds,
        formattedDuration: formatDuration(durationSeconds),
        isFallback: false,
      };
    }
  } catch (err) {
    console.warn('[ROUTING][FALLBACK] OSRM routing failed, using straight-line calculation:', err);
  }

  // Fallback: Haversine distance with straight lines between waypoints
  let totalKm = 0;
  for (let i = 0; i < validWaypoints.length - 1; i++) {
    totalKm += calculateHaversineKm(
      validWaypoints[i].latitude,
      validWaypoints[i].longitude,
      validWaypoints[i + 1].latitude,
      validWaypoints[i + 1].longitude
    );
  }

  // Estimate duration assuming average speed of 45 km/h for road transit
  const estimatedSeconds = (totalKm / 45) * 3600;

  return {
    coordinates: validWaypoints.map((w) => [w.latitude, w.longitude]),
    distanceMeters: totalKm * 1000,
    distanceKm: Number(totalKm.toFixed(1)),
    durationSeconds: estimatedSeconds,
    formattedDuration: formatDuration(estimatedSeconds),
    isFallback: true,
  };
}
