// ─── FuelEU Maritime Domain Entities ─────────────────────────────────────────
// These are pure domain objects with no framework dependencies.

export type VesselType = 'Container' | 'BulkCarrier' | 'Tanker' | 'RoRo';
export type FuelType = 'HFO' | 'LNG' | 'MGO' | 'VLSFO' | 'Methanol' | 'Ammonia';

export interface Route {
  id: string;
  routeId: string;
  vesselType: VesselType;
  fuelType: FuelType;
  year: number;
  ghgIntensity: number;       // gCO₂e/MJ
  fuelConsumption: number;    // tonnes
  distance: number;           // km
  totalEmissions: number;     // tonnes CO₂e
  isBaseline: boolean;
  createdAt: Date;
}

export interface ComparisonResult {
  baselineRoute: Route;
  comparisonRoute: Route;
  percentDiff: number;        // ((comparison / baseline) - 1) * 100
  compliant: boolean;         // ghgIntensity <= TARGET_INTENSITY
}

export interface ShipCompliance {
  id: string;
  shipId: string;
  year: number;
  cbGco2eq: number;           // Compliance Balance in gCO₂e
  computedAt: Date;
}

export interface BankEntry {
  id: string;
  shipId: string;
  year: number;
  amountGco2eq: number;       // banked surplus amount
  remainingGco2eq: number;    // still available to apply
  createdAt: Date;
}

export interface Pool {
  id: string;
  year: number;
  createdAt: Date;
}

export interface PoolMember {
  poolId: string;
  shipId: string;
  cbBefore: number;
  cbAfter: number;
}

export interface PoolWithMembers extends Pool {
  members: PoolMember[];
  poolSum: number;
}

// ─── Domain Constants (FuelEU Maritime Regulation (EU) 2023/1805) ────────────

/** Target GHG intensity for 2025: 2% below 2020 baseline of 91.16 gCO₂e/MJ */
export const TARGET_INTENSITY_2025 = 89.3368; // gCO₂e/MJ

/** Energy conversion factor for fossil fuels (MJ per tonne) */
export const ENERGY_CONVERSION_MJ_PER_TONNE = 41_000;

// ─── Domain Errors ────────────────────────────────────────────────────────────

export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InsufficientBankBalanceError extends DomainError {
  constructor(requested: number, available: number) {
    super(
      `Cannot apply ${requested.toFixed(2)} gCO₂e: only ${available.toFixed(2)} gCO₂e available in bank`,
      'INSUFFICIENT_BANK_BALANCE'
    );
  }
}

export class NegativeComplianceBalanceError extends DomainError {
  constructor(shipId: string, cb: number) {
    super(
      `Ship ${shipId} has negative CB (${cb.toFixed(2)} gCO₂e) — cannot bank a deficit`,
      'NEGATIVE_CB_CANNOT_BANK'
    );
  }
}

export class InvalidPoolError extends DomainError {
  constructor(reason: string) {
    super(`Invalid pool composition: ${reason}`, 'INVALID_POOL');
  }
}

export class RouteNotFoundError extends DomainError {
  constructor(routeId: string) {
    super(`Route ${routeId} not found`, 'ROUTE_NOT_FOUND');
  }
}
