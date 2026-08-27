import { EvaluationResult } from './match-score.js';
import { CandidateContext } from './matching.types.js';

/**
 * Generates transparent, factual explanation bullet points based on actual score metrics
 */
export function generateMatchExplanation(evaluation: EvaluationResult, context: CandidateContext): string[] {
  const { metrics, scores } = evaluation;
  const { targetTrip } = context;
  const explanations: string[] = [];

  // 1. Destination
  if (scores.destinationScore >= 0.95) {
    explanations.push(`Same destination (${targetTrip.destination.name})`);
  } else if (metrics.destinationDistanceKm > 0 && metrics.destinationDistanceKm <= 10) {
    explanations.push(`Destination is within ${Math.round(metrics.destinationDistanceKm)} km`);
  }

  // 2. Travel Date
  if (metrics.deltaDays === 0) {
    explanations.push(`Same travel date (${targetTrip.travelDate})`);
  } else if (metrics.deltaDays === 1) {
    explanations.push('Travelling 1 day apart');
  }

  // 3. Route Overlap
  if (metrics.routeOverlapPercentage >= 70) {
    explanations.push(`${metrics.routeOverlapPercentage}% route trajectory overlap`);
  } else if (metrics.matchingStopNames.length > 0) {
    explanations.push(`Shares intermediate stops: ${metrics.matchingStopNames.slice(0, 2).join(', ')}`);
  }

  // 4. Departure Time
  if (metrics.deltaMinutes <= 15) {
    explanations.push('Departing at approximately the same time (within 15 mins)');
  } else if (metrics.deltaMinutes <= 60) {
    explanations.push(`Departure times are within ${metrics.deltaMinutes} minutes`);
  } else if (metrics.deltaMinutes <= 120) {
    explanations.push('Departing within 2 hours of each other');
  }

  // 5. Transport Mode
  if (metrics.isSameTransport) {
    const formattedTransport = targetTrip.transportType.replace('_', ' ');
    explanations.push(`Same transport mode: ${formattedTransport.toUpperCase()}`);
  }

  // 6. Preferences
  if (metrics.preferenceReasons.length > 0) {
    for (const reason of metrics.preferenceReasons) {
      explanations.push(reason);
    }
  }

  return explanations;
}
