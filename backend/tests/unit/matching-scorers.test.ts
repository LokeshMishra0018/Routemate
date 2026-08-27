import { describe, it, expect } from 'vitest';
import { calculateDestinationScore } from '../../src/modules/matching/destination-scoring.js';
import { calculateRouteScore } from '../../src/modules/matching/route-scoring.js';
import { calculateDateScore } from '../../src/modules/matching/date-scoring.js';
import { calculateTimeScore } from '../../src/modules/matching/time-scoring.js';
import { calculateTransportScore } from '../../src/modules/matching/transport-scoring.js';
import { calculatePreferenceScore } from '../../src/modules/matching/preference-scoring.js';
import { evaluateTripMatch } from '../../src/modules/matching/match-score.js';
import { generateMatchExplanation } from '../../src/modules/matching/match-explanation.js';
import { TripDocument } from '../../src/modules/trips/trips.types.js';
import { ObjectId } from 'mongodb';

describe('Matching Engine Component Scorers (Unit)', () => {
  it('calculateDestinationScore: should score 1.0 for exact normalized names or < 3km distance', () => {
    const dest1 = {
      name: 'New Delhi Railway Station',
      normalizedName: 'new delhi railway station',
      coordinates: { type: 'Point' as const, coordinates: [77.2195, 28.6429] as [number, number] },
    };
    const dest2 = {
      name: 'NDLS Station',
      normalizedName: 'ndls station',
      coordinates: { type: 'Point' as const, coordinates: [77.221, 28.6435] as [number, number] },
    };

    const result = calculateDestinationScore(dest1, dest2);
    expect(result.score).toBe(1.0);
    expect(result.distanceKm).toBeLessThan(3);
  });

  it('calculateRouteScore: should recognize strong compatibility for sub-route overlaps', () => {
    // Trip A: Ghaziabad -> New Delhi -> Lucknow -> Gorakhpur -> Raxaul
    const tripA: TripDocument = {
      _id: new ObjectId(),
      userId: 'user1',
      source: { name: 'Ghaziabad', normalizedName: 'ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
      destination: { name: 'Raxaul', normalizedName: 'raxaul', coordinates: { type: 'Point', coordinates: [84.8504, 26.9784] } },
      travelDate: '2026-09-10',
      departureTime: '08:00',
      transportType: 'train',
      status: 'planning',
      stops: [
        { name: 'New Delhi', normalizedName: 'new delhi', coordinates: { type: 'Point', coordinates: [77.2195, 28.6429] }, sequenceNumber: 1 },
        { name: 'Lucknow', normalizedName: 'lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] }, sequenceNumber: 2 },
        { name: 'Gorakhpur', normalizedName: 'gorakhpur', coordinates: { type: 'Point', coordinates: [83.3732, 26.7606] }, sequenceNumber: 3 },
      ],
      preferences: { genderPreference: 'any' },
      costSharing: { enabled: false },
      availableSeats: 2,
      isRecurring: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Trip B: Delhi -> Lucknow -> Gorakhpur -> Raxaul
    const tripB: TripDocument = {
      _id: new ObjectId(),
      userId: 'user2',
      source: { name: 'New Delhi', normalizedName: 'new delhi', coordinates: { type: 'Point', coordinates: [77.2195, 28.6429] } },
      destination: { name: 'Raxaul', normalizedName: 'raxaul', coordinates: { type: 'Point', coordinates: [84.8504, 26.9784] } },
      travelDate: '2026-09-10',
      departureTime: '08:45',
      transportType: 'train',
      status: 'planning',
      stops: [
        { name: 'Lucknow', normalizedName: 'lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] }, sequenceNumber: 1 },
        { name: 'Gorakhpur', normalizedName: 'gorakhpur', coordinates: { type: 'Point', coordinates: [83.3732, 26.7606] }, sequenceNumber: 2 },
      ],
      preferences: { genderPreference: 'any' },
      costSharing: { enabled: false },
      availableSeats: 1,
      isRecurring: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const routeResult = calculateRouteScore(tripA, tripB);
    expect(routeResult.score).toBeGreaterThanOrEqual(0.85);
    expect(routeResult.overlapPercentage).toBeGreaterThanOrEqual(85);
    expect(routeResult.matchingStopNames).toContain('New Delhi');
    expect(routeResult.matchingStopNames).toContain('Lucknow');
  });

  it('calculateDateScore: should score 1.0 for same date and 0.4 for 1 day apart', () => {
    expect(calculateDateScore('2026-09-10', '2026-09-10').score).toBe(1.0);
    expect(calculateDateScore('2026-09-10', '2026-09-11').score).toBe(0.4);
    expect(calculateDateScore('2026-09-10', '2026-09-15').score).toBe(0.0);
  });

  it('calculateTimeScore: should score according to delta minute tiers', () => {
    expect(calculateTimeScore('08:00', '08:15').score).toBe(1.0);
    expect(calculateTimeScore('08:00', '08:30').score).toBe(0.90);
    expect(calculateTimeScore('08:00', '09:00').score).toBe(0.75);
    expect(calculateTimeScore('08:00', '13:00').score).toBe(0.10);
  });

  it('calculateTransportScore: should score 1.0 for exact and 0.85 for cab/personal_vehicle', () => {
    expect(calculateTransportScore('train', 'train').score).toBe(1.0);
    expect(calculateTransportScore('cab', 'personal_vehicle').score).toBe(0.85);
    expect(calculateTransportScore('flight', 'bus').score).toBe(0.20);
  });

  it('calculatePreferenceScore: should enforce strict same_gender filter', () => {
    // Both female -> pass
    const matchRes = calculatePreferenceScore(
      { genderPreference: 'same_gender' },
      { genderPreference: 'any' },
      'female',
      'female'
    );
    expect(matchRes.isEligible).toBe(true);

    // Male vs Female when same_gender is required -> fail
    const mismatchRes = calculatePreferenceScore(
      { genderPreference: 'same_gender' },
      { genderPreference: 'any' },
      'male',
      'female'
    );
    expect(mismatchRes.isEligible).toBe(false);
    expect(mismatchRes.score).toBe(0);
  });

  it('evaluateTripMatch & generateMatchExplanation: should calculate weighted score and explanation', () => {
    const tripA: TripDocument = {
      _id: new ObjectId(),
      userId: 'userA',
      source: { name: 'Ghaziabad', normalizedName: 'ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
      destination: { name: 'Lucknow', normalizedName: 'lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
      travelDate: '2026-09-10',
      departureTime: '09:00',
      transportType: 'train',
      status: 'planning',
      stops: [],
      preferences: { genderPreference: 'any', conversationPreference: 'moderate' },
      costSharing: { enabled: false },
      availableSeats: 2,
      isRecurring: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tripB: TripDocument = {
      _id: new ObjectId(),
      userId: 'userB',
      source: { name: 'Ghaziabad', normalizedName: 'ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
      destination: { name: 'Lucknow', normalizedName: 'lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
      travelDate: '2026-09-10',
      departureTime: '09:15',
      transportType: 'train',
      status: 'planning',
      stops: [],
      preferences: { genderPreference: 'any', conversationPreference: 'moderate' },
      costSharing: { enabled: false },
      availableSeats: 1,
      isRecurring: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const context = {
      targetTrip: tripA,
      candidateTrip: tripB,
      targetGender: 'male',
      candidateGender: 'male',
    };

    const evaluation = evaluateTripMatch(context);
    expect(evaluation.isEligible).toBe(true);
    expect(evaluation.scores.score).toBeGreaterThanOrEqual(95);

    const explanation = generateMatchExplanation(evaluation, context);
    expect(explanation.some((e) => e.includes('Same destination'))).toBe(true);
    expect(explanation.some((e) => e.includes('Same travel date'))).toBe(true);
    expect(explanation.some((e) => e.includes('Same transport mode: TRAIN'))).toBe(true);
  });
});
