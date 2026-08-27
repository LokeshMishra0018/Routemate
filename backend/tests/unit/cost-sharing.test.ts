import { describe, it, expect } from 'vitest';
import { calculatePerPersonCost } from '../../src/modules/groups/cost-calculator.js';

describe('Cost Sharing Calculator (Unit)', () => {
  it('should correctly split estimated total cost across members', () => {
    expect(calculatePerPersonCost(1200, 3)).toBe(400);
    expect(calculatePerPersonCost(1000, 4)).toBe(250);
  });

  it('should round up floating cents to two decimal places', () => {
    // 1000 / 3 = 333.3333... -> 333.34
    expect(calculatePerPersonCost(1000, 3)).toBe(333.34);
    // 500 / 6 = 83.3333... -> 83.34
    expect(calculatePerPersonCost(500, 6)).toBe(83.34);
  });

  it('should handle edge cases with 0 or negative inputs gracefully', () => {
    expect(calculatePerPersonCost(0, 4)).toBe(0);
    expect(calculatePerPersonCost(1000, 0)).toBe(0);
    expect(calculatePerPersonCost(-500, 2)).toBe(0);
  });
});
