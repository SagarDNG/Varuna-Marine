import {
  ENERGY_CONVERSION_MJ_PER_TONNE,
  TARGET_INTENSITY_2025,
} from './entities';

/**
 * Compute energy in scope (MJ) from fuel consumption (tonnes).
 * FuelEU Maritime Annex IV formula.
 */
export function computeEnergyInScope(fuelConsumptionTonnes: number): number {
  return fuelConsumptionTonnes * ENERGY_CONVERSION_MJ_PER_TONNE;
}

/**
 * Compute Compliance Balance (CB) in gCO₂e.
 * CB = (Target − Actual) × EnergyInScope
 * Positive → Surplus | Negative → Deficit
 */
export function computeComplianceBalance(
  actualGhgIntensity: number,
  fuelConsumptionTonnes: number,
  targetIntensity: number = TARGET_INTENSITY_2025
): number {
  const energyInScope = computeEnergyInScope(fuelConsumptionTonnes);
  return (targetIntensity - actualGhgIntensity) * energyInScope;
}

/**
 * Compute percent difference between comparison and baseline GHG intensities.
 * percentDiff = ((comparison / baseline) − 1) × 100
 */
export function computePercentDiff(
  baselineIntensity: number,
  comparisonIntensity: number
): number {
  if (baselineIntensity === 0) throw new Error('Baseline intensity cannot be zero');
  return ((comparisonIntensity / baselineIntensity) - 1) * 100;
}

/**
 * Determine compliance: a route is compliant if its GHG intensity is at or
 * below the target intensity for the regulation year.
 */
export function isCompliant(
  ghgIntensity: number,
  targetIntensity: number = TARGET_INTENSITY_2025
): boolean {
  return ghgIntensity <= targetIntensity;
}

/**
 * Greedy pool allocation algorithm (FuelEU Article 21).
 * Sorts members descending by CB, then transfers surplus to deficits.
 * Returns updated cb_after values per member.
 */
export function allocatePool(
  members: Array<{ shipId: string; cbBefore: number }>
): Array<{ shipId: string; cbBefore: number; cbAfter: number }> {
  // Work with mutable copies
  const working = members.map(m => ({ ...m, cbAfter: m.cbBefore }));

  // Sort descending: surplus ships first
  working.sort((a, b) => b.cbAfter - a.cbAfter);

  for (let i = 0; i < working.length; i++) {
    for (let j = working.length - 1; j > i; j--) {
      if (working[i].cbAfter > 0 && working[j].cbAfter < 0) {
        const transfer = Math.min(working[i].cbAfter, -working[j].cbAfter);
        working[i].cbAfter -= transfer;
        working[j].cbAfter += transfer;
      }
    }
  }

  return working;
}
