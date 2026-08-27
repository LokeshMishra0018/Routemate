/**
 * Computes per-person cost share split rounded up to nearest integer/cent
 */
export function calculatePerPersonCost(estimatedTotalCost: number, memberCount: number): number {
  if (estimatedTotalCost <= 0 || memberCount <= 0) {
    return 0;
  }
  return Math.ceil((estimatedTotalCost / memberCount) * 100) / 100;
}
