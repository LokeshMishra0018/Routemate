import { MatchScores, CandidateContext } from './matching.types.js';
import { calculateRouteScore } from './route-scoring.js';
import { calculateDestinationScore } from './destination-scoring.js';
import { calculateDateScore } from './date-scoring.js';
import { calculateTimeScore } from './time-scoring.js';
import { calculateTransportScore } from './transport-scoring.js';
import { calculatePreferenceScore } from './preference-scoring.js';

export const MATCH_WEIGHTS = {
  route: 0.35,
  destination: 0.20,
  date: 0.15,
  time: 0.10,
  transport: 0.10,
  preferences: 0.10,
} as const;

export interface EvaluationResult {
  scores: MatchScores;
  isEligible: boolean;
  metrics: {
    routeOverlapPercentage: number;
    matchingStopNames: string[];
    destinationDistanceKm: number;
    deltaDays: number;
    deltaMinutes: number;
    isSameTransport: boolean;
    preferenceReasons: string[];
  };
}

/**
 * Calculates complete match scores and component evaluations
 */
export function evaluateTripMatch(context: CandidateContext): EvaluationResult {
  const { targetTrip, candidateTrip, targetGender, candidateGender } = context;

  // 1. Route Overlap (35%)
  const routeResult = calculateRouteScore(targetTrip, candidateTrip);

  // 2. Destination Compatibility (20%)
  const destResult = calculateDestinationScore(targetTrip.destination, candidateTrip.destination);

  // 3. Travel Date (15%)
  const dateResult = calculateDateScore(targetTrip.travelDate, candidateTrip.travelDate);

  // 4. Departure Time (10%)
  const timeResult = calculateTimeScore(targetTrip.departureTime, candidateTrip.departureTime);

  // 5. Transport Mode (10%)
  const transportResult = calculateTransportScore(targetTrip.transportType, candidateTrip.transportType);

  // 6. Preferences (10%)
  const prefResult = calculatePreferenceScore(
    targetTrip.preferences,
    candidateTrip.preferences,
    targetGender,
    candidateGender
  );

  // If hard preference constraint failed (e.g. same_gender mismatch), match is ineligible
  if (!prefResult.isEligible) {
    return {
      scores: {
        score: 0,
        routeScore: routeResult.score,
        destinationScore: destResult.score,
        dateScore: dateResult.score,
        timeScore: timeResult.score,
        transportScore: transportResult.score,
        preferenceScore: 0,
      },
      isEligible: false,
      metrics: {
        routeOverlapPercentage: routeResult.overlapPercentage,
        matchingStopNames: routeResult.matchingStopNames,
        destinationDistanceKm: destResult.distanceKm,
        deltaDays: dateResult.deltaDays,
        deltaMinutes: timeResult.deltaMinutes,
        isSameTransport: transportResult.isSame,
        preferenceReasons: prefResult.reasons,
      },
    };
  }

  // Composite weighted score (0 - 100)
  const rawWeightedScore =
    routeResult.score * MATCH_WEIGHTS.route +
    destResult.score * MATCH_WEIGHTS.destination +
    dateResult.score * MATCH_WEIGHTS.date +
    timeResult.score * MATCH_WEIGHTS.time +
    transportResult.score * MATCH_WEIGHTS.transport +
    prefResult.score * MATCH_WEIGHTS.preferences;

  const score = Math.round(Math.min(100, Math.max(0, rawWeightedScore * 100)));

  return {
    scores: {
      score,
      routeScore: Number(routeResult.score.toFixed(2)),
      destinationScore: Number(destResult.score.toFixed(2)),
      dateScore: Number(dateResult.score.toFixed(2)),
      timeScore: Number(timeResult.score.toFixed(2)),
      transportScore: Number(transportResult.score.toFixed(2)),
      preferenceScore: Number(prefResult.score.toFixed(2)),
    },
    isEligible: true,
    metrics: {
      routeOverlapPercentage: routeResult.overlapPercentage,
      matchingStopNames: routeResult.matchingStopNames,
      destinationDistanceKm: destResult.distanceKm,
      deltaDays: dateResult.deltaDays,
      deltaMinutes: timeResult.deltaMinutes,
      isSameTransport: transportResult.isSame,
      preferenceReasons: prefResult.reasons,
    },
  };
}
