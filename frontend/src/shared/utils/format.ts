import { TARGET_INTENSITY } from '../../core/domain/types';

export function formatGHG(value: number): string {
  return `${value.toFixed(2)} gCO₂e/MJ`;
}

export function formatCB(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} GgCO₂e`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} MgCO₂e`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)} kgCO₂e`;
  return `${value.toFixed(0)} gCO₂e`;
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function isCompliant(ghgIntensity: number): boolean {
  return ghgIntensity <= TARGET_INTENSITY;
}

export function cbClass(value: number): string {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-rose-400';
  return 'text-slate-400';
}
