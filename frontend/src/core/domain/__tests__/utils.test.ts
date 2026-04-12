import { describe, it, expect } from 'vitest';
import { formatCB, formatPercent, isCompliant, cbClass } from '../../../shared/utils/format';
import { TARGET_INTENSITY } from '../types';

describe('formatCB', () => {
  it('formats giga values', () => {
    expect(formatCB(1_500_000_000)).toContain('GgCO₂e');
  });
  it('formats mega values', () => {
    expect(formatCB(2_500_000)).toContain('MgCO₂e');
  });
  it('formats kilo values', () => {
    expect(formatCB(4_500)).toContain('kgCO₂e');
  });
  it('formats small values', () => {
    expect(formatCB(500)).toContain('gCO₂e');
  });
  it('handles negative values', () => {
    expect(formatCB(-1_000_000)).toContain('-');
  });
});

describe('formatPercent', () => {
  it('adds + sign for positive values', () => {
    expect(formatPercent(2.5)).toBe('+2.50%');
  });
  it('no prefix for negative values', () => {
    expect(formatPercent(-3.1)).toBe('-3.10%');
  });
  it('zero', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });
});

describe('isCompliant', () => {
  it('marks value at target as compliant', () => {
    expect(isCompliant(TARGET_INTENSITY)).toBe(true);
  });
  it('marks value below target as compliant', () => {
    expect(isCompliant(88)).toBe(true);
  });
  it('marks value above target as non-compliant', () => {
    expect(isCompliant(91)).toBe(false);
  });
});

describe('cbClass', () => {
  it('returns emerald for positive CB', () => {
    expect(cbClass(1000)).toContain('emerald');
  });
  it('returns rose for negative CB', () => {
    expect(cbClass(-1000)).toContain('rose');
  });
  it('returns slate for zero', () => {
    expect(cbClass(0)).toContain('slate');
  });
});
