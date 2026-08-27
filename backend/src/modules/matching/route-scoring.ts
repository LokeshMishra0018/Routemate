import { TripDocument, LocationPoint } from '../trips/trips.types.js';
import { calculateDistanceKm } from './geo-utils.js';

export interface RouteOverlapResult {
  score: number; // 0.0 - 1.0
  overlapPercentage: number; // 0 - 100
  matchingStopNames: string[];
}

/**
 * Checks if two location points are matching (by normalized name or < 5km distance)
 */
function isLocationMatch(loc1: LocationPoint, loc2: LocationPoint): boolean {
  if (loc1.normalizedName === loc2.normalizedName) {
    return true;
  }
  if (loc1.normalizedName.includes(loc2.normalizedName) || loc2.normalizedName.includes(loc1.normalizedName)) {
    return true;
  }
  const dist = calculateDistanceKm(loc1.coordinates, loc2.coordinates);
  return dist <= 5;
}

/**
 * Computes Route Overlap Score (0.0 - 1.0) and sequential trajectory alignment
 */
export function calculateRouteScore(tripA: TripDocument, tripB: TripDocument): RouteOverlapResult {
  // Construct ordered waypoint arrays for both trips: [source, ...stops, destination]
  const waypointsA: LocationPoint[] = [tripA.source, ...(tripA.stops || []), tripA.destination];
  const waypointsB: LocationPoint[] = [tripB.source, ...(tripB.stops || []), tripB.destination];

  const matchingStopNames: string[] = [];
  let matchingPairsCount = 0;
  let lastMatchedIndexB = -1;
  let inSequence = true;

  for (const wpA of waypointsA) {
    for (let j = 0; j < waypointsB.length; j++) {
      const wpB = waypointsB[j];
      if (isLocationMatch(wpA, wpB)) {
        matchingPairsCount++;
        matchingStopNames.push(wpA.name);

        if (j < lastMatchedIndexB) {
          inSequence = false; // Travel direction / sequence mismatch!
        }
        lastMatchedIndexB = j;
        break;
      }
    }
  }

  const maxWaypoints = Math.max(waypointsA.length, waypointsB.length);
  const minWaypoints = Math.min(waypointsA.length, waypointsB.length);

  // If at least both origin and destination match in sequence
  const originMatch = isLocationMatch(tripA.source, tripB.source);
  const destMatch = isLocationMatch(tripA.destination, tripB.destination);

  let score = 0.1;
  if (originMatch && destMatch) {
    score = 0.95;
    // Perfect match if stop count also matches
    if (matchingPairsCount === maxWaypoints) {
      score = 1.0;
    }
  } else if (originMatch || destMatch) {
    // Shared origin or shared destination with intermediate overlap
    score = 0.60 + 0.35 * (matchingPairsCount / maxWaypoints);
  } else if (matchingPairsCount >= 2) {
    // Intermediate sub-route overlap (e.g. sharing key legs of the journey)
    score = (matchingPairsCount / minWaypoints) * 0.85;
  } else if (matchingPairsCount === 1) {
    score = 0.35;
  }

  // Penalize out-of-sequence route overlaps (travelling opposite directions)
  if (!inSequence && matchingPairsCount > 1) {
    score = score * 0.2;
  }

  const overlapPercentage = Math.round(Math.min(1.0, score) * 100);

  return {
    score: Math.min(1.0, Math.max(0.0, score)),
    overlapPercentage,
    matchingStopNames,
  };
}
