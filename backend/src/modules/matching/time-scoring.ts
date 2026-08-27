/**
 * Computes departure time compatibility score (0.0 - 1.0)
 * Uses centralized thresholds defined in the specification.
 */
export function calculateTimeScore(timeA: string, timeB: string): { score: number; deltaMinutes: number } {
  const [hA, mA] = timeA.split(':').map((n) => parseInt(n, 10));
  const [hB, mB] = timeB.split(':').map((n) => parseInt(n, 10));

  const totalMinA = hA * 60 + mA;
  const totalMinB = hB * 60 + mB;

  const deltaMinutes = Math.abs(totalMinA - totalMinB);

  let score = 0.10;
  if (deltaMinutes <= 15) {
    score = 1.0;
  } else if (deltaMinutes <= 30) {
    score = 0.90;
  } else if (deltaMinutes <= 60) {
    score = 0.75;
  } else if (deltaMinutes <= 90) {
    score = 0.60;
  } else if (deltaMinutes <= 180) {
    score = 0.35;
  }

  return { score, deltaMinutes };
}
