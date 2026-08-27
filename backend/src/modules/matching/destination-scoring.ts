import { LocationPoint } from '../trips/trips.types.js';
import { calculateDistanceKm } from './geo-utils.js';

/**
 * Computes destination compatibility score (0.0 - 1.0)
 */
export function calculateDestinationScore(destA: LocationPoint, destB: LocationPoint): { score: number; distanceKm: number } {
  // 1. Exact normalized name match
  if (destA.normalizedName === destB.normalizedName) {
    return { score: 1.0, distanceKm: 0 };
  }

  // 2. Proximity-based calculation
  const distanceKm = calculateDistanceKm(destA.coordinates, destB.coordinates);

  let score = 0.1;
  if (distanceKm <= 3) {
    score = 1.0;
  } else if (distanceKm <= 10) {
    score = 0.85;
  } else if (distanceKm <= 25) {
    score = 0.65;
  } else if (distanceKm <= 50) {
    score = 0.40;
  } else if (distanceKm <= 100) {
    score = 0.20;
  }

  // 3. Name substring similarity boost if names share significant words
  if (
    destA.normalizedName.includes(destB.normalizedName) ||
    destB.normalizedName.includes(destA.normalizedName)
  ) {
    score = Math.max(score, 0.75);
  }

  return { score, distanceKm };
}
