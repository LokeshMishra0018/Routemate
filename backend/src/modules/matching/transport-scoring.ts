import { TransportType } from '../trips/trips.types.js';

/**
 * Computes transport mode compatibility score (0.0 - 1.0)
 */
export function calculateTransportScore(typeA: TransportType, typeB: TransportType): { score: number; isSame: boolean } {
  if (typeA === typeB) {
    return { score: 1.0, isSame: true };
  }

  // Compatible vehicular transport modes
  if (
    (typeA === 'cab' && typeB === 'personal_vehicle') ||
    (typeA === 'personal_vehicle' && typeB === 'cab')
  ) {
    return { score: 0.85, isSame: false };
  }

  // Shared land mass transit (train & bus)
  if (
    (typeA === 'train' && typeB === 'bus') ||
    (typeA === 'bus' && typeB === 'train')
  ) {
    return { score: 0.60, isSame: false };
  }

  return { score: 0.20, isSame: false };
}
