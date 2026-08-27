/**
 * Computes travel date compatibility score (0.0 - 1.0)
 */
export function calculateDateScore(dateA: string, dateB: string): { score: number; deltaDays: number } {
  if (dateA === dateB) {
    return { score: 1.0, deltaDays: 0 };
  }

  const timeA = new Date(`${dateA}T00:00:00Z`).getTime();
  const timeB = new Date(`${dateB}T00:00:00Z`).getTime();
  const diffDays = Math.round(Math.abs(timeA - timeB) / (24 * 60 * 60 * 1000));

  let score = 0.0;
  if (diffDays === 1) {
    score = 0.40; // 1-day tolerance
  } else if (diffDays === 2) {
    score = 0.15;
  }

  return { score, deltaDays: diffDays };
}
