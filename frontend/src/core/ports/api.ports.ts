import type {
  Route,
  ComparisonData,
  ShipCompliance,
  AdjustedCB,
  BankRecords,
  BankActionResult,
  Pool,
  RouteFilters,
} from '../domain/types';

export interface IRoutePort {
  getRoutes(filters?: RouteFilters): Promise<Route[]>;
  setBaseline(id: string): Promise<Route>;
  getComparison(): Promise<ComparisonData>;
}

export interface ICompliancePort {
  getCB(shipId: string, year: number): Promise<ShipCompliance>;
  getAdjustedCB(shipId: string, year: number): Promise<AdjustedCB>;
}

export interface IBankingPort {
  getBankRecords(shipId: string, year: number): Promise<BankRecords>;
  bankSurplus(shipId: string, year: number, amount: number): Promise<BankActionResult>;
  applyBanked(shipId: string, year: number, amount: number): Promise<BankActionResult>;
}

export interface IPoolingPort {
  getPools(year?: number): Promise<Pool[]>;
  createPool(year: number, members: Array<{ shipId: string; cbOverride?: number }>): Promise<Pool>;
}
