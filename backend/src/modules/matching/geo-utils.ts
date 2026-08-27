import { GeoPoint } from '../trips/trips.types.js';

/**
 * Calculates great-circle distance between two GeoPoints in kilometers using the Haversine formula.
 */
export function calculateDistanceKm(point1: GeoPoint, point2: GeoPoint): number {
  const [lon1, lat1] = point1.coordinates;
  const [lon2, lat2] = point2.coordinates;

  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
