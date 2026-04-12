import {
  Route,
  ShipCompliance,
  BankEntry,
  Pool,
  PoolMember,
  PoolWithMembers,
} from '../domain/entities';

// ─── Route Repository Port ────────────────────────────────────────────────────

export interface IRouteRepository {
  findAll(): Promise<Route[]>;
  findById(id: string): Promise<Route | null>;
  findByRouteId(routeId: string): Promise<Route | null>;
  findBaseline(): Promise<Route | null>;
  setBaseline(id: string): Promise<Route>;
  findAllExceptBaseline(): Promise<Route[]>;
}

// ─── Compliance Repository Port ───────────────────────────────────────────────

export interface IComplianceRepository {
  upsertCompliance(record: Omit<ShipCompliance, 'id' | 'computedAt'>): Promise<ShipCompliance>;
  findCompliance(shipId: string, year: number): Promise<ShipCompliance | null>;
}

// ─── Bank Repository Port ─────────────────────────────────────────────────────

export interface IBankRepository {
  createBankEntry(entry: Omit<BankEntry, 'id' | 'createdAt'>): Promise<BankEntry>;
  findBankEntries(shipId: string, year: number): Promise<BankEntry[]>;
  getTotalAvailable(shipId: string, year: number): Promise<number>;
  applyFromBank(shipId: string, year: number, amount: number): Promise<void>;
}

// ─── Pool Repository Port ─────────────────────────────────────────────────────

export interface IPoolRepository {
  createPool(year: number, members: Array<{ shipId: string; cbBefore: number; cbAfter: number }>): Promise<PoolWithMembers>;
  findPool(poolId: string): Promise<PoolWithMembers | null>;
  findAllPools(year?: number): Promise<PoolWithMembers[]>;
}
