import {
  computeEnergyInScope,
  computeComplianceBalance,
  computePercentDiff,
  isCompliant,
  allocatePool,
} from '../formulas';
import { TARGET_INTENSITY_2025, ENERGY_CONVERSION_MJ_PER_TONNE } from '../entities';

describe('computeEnergyInScope', () => {
  it('multiplies fuel consumption by MJ conversion factor', () => {
    expect(computeEnergyInScope(1)).toBe(ENERGY_CONVERSION_MJ_PER_TONNE);
    expect(computeEnergyInScope(5000)).toBe(5000 * 41_000);
  });
});

describe('computeComplianceBalance', () => {
  it('returns positive CB for a compliant ship (actual < target)', () => {
    // actual=88 < target=89.3368
    const cb = computeComplianceBalance(88.0, 4800);
    const energy = 4800 * 41_000;
    const expected = (TARGET_INTENSITY_2025 - 88.0) * energy;
    expect(cb).toBeCloseTo(expected, 2);
    expect(cb).toBeGreaterThan(0);
  });

  it('returns negative CB for a non-compliant ship (actual > target)', () => {
    // actual=93.5 > target=89.3368
    const cb = computeComplianceBalance(93.5, 5100);
    expect(cb).toBeLessThan(0);
  });

  it('returns zero CB when actual equals target', () => {
    const cb = computeComplianceBalance(TARGET_INTENSITY_2025, 5000);
    expect(cb).toBeCloseTo(0, 4);
  });

  it('accepts custom target intensity', () => {
    const cb = computeComplianceBalance(85, 1000, 90);
    // CB = (90 - 85) * (1000 * 41_000) = 5 * 41_000_000 = 205_000_000
    expect(cb).toBeCloseTo((90 - 85) * 1000 * 41_000, 2);
  });
});

describe('computePercentDiff', () => {
  it('returns 0 when comparison equals baseline', () => {
    expect(computePercentDiff(91, 91)).toBe(0);
  });

  it('returns positive value when comparison > baseline', () => {
    const diff = computePercentDiff(91, 93.5);
    expect(diff).toBeGreaterThan(0);
    expect(diff).toBeCloseTo(((93.5 / 91) - 1) * 100, 4);
  });

  it('returns negative value when comparison < baseline', () => {
    const diff = computePercentDiff(91, 88);
    expect(diff).toBeLessThan(0);
  });

  it('throws when baseline is zero', () => {
    expect(() => computePercentDiff(0, 91)).toThrow();
  });
});

describe('isCompliant', () => {
  it('marks route compliant when intensity <= target', () => {
    expect(isCompliant(89.3368)).toBe(true);
    expect(isCompliant(88.0)).toBe(true);
    expect(isCompliant(89.0)).toBe(true);
  });

  it('marks route non-compliant when intensity > target', () => {
    expect(isCompliant(89.34)).toBe(false);
    expect(isCompliant(93.5)).toBe(false);
    expect(isCompliant(91.0)).toBe(false);
  });
});

describe('allocatePool', () => {
  it('transfers surplus to deficit member', () => {
    const members = [
      { shipId: 'S1', cbBefore: 1_000_000 },
      { shipId: 'S2', cbBefore: -500_000 },
    ];
    const result = allocatePool(members);
    const s2 = result.find(m => m.shipId === 'S2')!;
    expect(s2.cbAfter).toBeCloseTo(0, 2);
  });

  it('leaves surplus ship with reduced balance after transfer', () => {
    const members = [
      { shipId: 'S1', cbBefore: 1_000_000 },
      { shipId: 'S2', cbBefore: -500_000 },
    ];
    const result = allocatePool(members);
    const s1 = result.find(m => m.shipId === 'S1')!;
    expect(s1.cbAfter).toBeCloseTo(500_000, 2);
  });

  it('handles multiple members with mixed balances', () => {
    const members = [
      { shipId: 'A', cbBefore: 2_000_000 },
      { shipId: 'B', cbBefore: -800_000 },
      { shipId: 'C', cbBefore: -600_000 },
    ];
    const result = allocatePool(members);
    const totalAfter = result.reduce((s, m) => s + m.cbAfter, 0);
    const totalBefore = members.reduce((s, m) => s + m.cbBefore, 0);
    // Conservation: total CB should be preserved
    expect(totalAfter).toBeCloseTo(totalBefore, 2);
    // No member should have negative balance if pool sum >= 0
    result.forEach(m => expect(m.cbAfter).toBeGreaterThanOrEqual(-0.01));
  });

  it('does not change balances when all members are in surplus', () => {
    const members = [
      { shipId: 'A', cbBefore: 500_000 },
      { shipId: 'B', cbBefore: 300_000 },
    ];
    const result = allocatePool(members);
    expect(result.find(m => m.shipId === 'A')!.cbAfter).toBeCloseTo(500_000, 2);
    expect(result.find(m => m.shipId === 'B')!.cbAfter).toBeCloseTo(300_000, 2);
  });
});
