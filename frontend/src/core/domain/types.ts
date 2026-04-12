// ─── FuelEU Maritime Frontend Domain Types ────────────────────────────────────

export type VesselType = 'Container' | 'BulkCarrier' | 'Tanker' | 'RoRo';
export type FuelType = 'HFO' | 'LNG' | 'MGO' | 'VLSFO' | 'Methanol' | 'Ammonia';

export interface Route {
  id: string;
  routeId: string;
  vesselType: VesselType;
  fuelType: FuelType;
  year: number;
  ghgIntensity: number;
  fuelConsumption: number;
  distance: number;
  totalEmissions: number;
  isBaseline: boolean;
  createdAt: string;
}

export interface ComparisonResult {
  baselineRoute: Route;
  comparisonRoute: Route;
  percentDiff: number;
  compliant: boolean;
}

export interface ComparisonData {
  baseline: Route;
  comparisons: ComparisonResult[];
}

export interface ShipCompliance {
  id: string;
  shipId: string;
  year: number;
  cbGco2eq: number;
  computedAt: string;
}

export interface AdjustedCB {
  shipId: string;
  year: number;
  cbRaw: number;
  bankedApplied: number;
  cbAdjusted: number;
}

export interface BankEntry {
  id: string;
  shipId: string;
  year: number;
  amountGco2eq: number;
  remainingGco2eq: number;
  createdAt: string;
}

export interface BankRecords {
  entries: BankEntry[];
  totalBanked: number;
  totalAvailable: number;
}

export interface BankActionResult {
  cbBefore: number;
  applied?: number;
  cbAfter: number;
  entry?: BankEntry;
}

export interface PoolMember {
  poolId: string;
  shipId: string;
  cbBefore: number;
  cbAfter: number;
}

export interface Pool {
  id: string;
  year: number;
  createdAt: string;
  members: PoolMember[];
  poolSum: number;
}

export interface RouteFilters {
  vesselType?: string;
  fuelType?: string;
  year?: string;
}

/** 2025 FuelEU target: 2% below 91.16 gCO₂e/MJ */
export const TARGET_INTENSITY = 89.3368;
