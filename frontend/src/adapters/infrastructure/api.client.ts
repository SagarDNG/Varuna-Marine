import type {
  Route,
  ComparisonData,
  ShipCompliance,
  AdjustedCB,
  BankRecords,
  BankActionResult,
  Pool,
  RouteFilters,
} from '../../core/domain/types';
import type {
  IRoutePort,
  ICompliancePort,
  IBankingPort,
  IPoolingPort,
} from '../../core/ports/api.ports';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

if (!BASE_URL) {
  throw new Error('VITE_API_URL is missing');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return json;
}

// ─── Route API ────────────────────────────────────────────────────────────────

export const routeApi: IRoutePort = {
  async getRoutes(filters?: RouteFilters): Promise<Route[]> {
    const params = new URLSearchParams();
    if (filters?.vesselType) params.set('vesselType', filters.vesselType);
    if (filters?.fuelType) params.set('fuelType', filters.fuelType);
    if (filters?.year) params.set('year', filters.year);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch<{ data: Route[] }>(`/routes${qs}`);
    return res.data;
  },

  async setBaseline(id: string): Promise<Route> {
    const res = await apiFetch<{ data: Route }>(`/routes/${id}/baseline`, { method: 'POST' });
    return res.data;
  },

  async getComparison(): Promise<ComparisonData> {
    const res = await apiFetch<{ data: ComparisonData }>('/routes/comparison');
    return res.data;
  },
};

// ─── Compliance API ───────────────────────────────────────────────────────────

export const complianceApi: ICompliancePort = {
  async getCB(shipId: string, year: number): Promise<ShipCompliance> {
    const res = await apiFetch<{ data: ShipCompliance }>(
      `/compliance/cb?shipId=${shipId}&year=${year}`
    );
    return res.data;
  },

  async getAdjustedCB(shipId: string, year: number): Promise<AdjustedCB> {
    const res = await apiFetch<{ data: AdjustedCB }>(
      `/compliance/adjusted-cb?shipId=${shipId}&year=${year}`
    );
    return res.data;
  },
};

// ─── Banking API ──────────────────────────────────────────────────────────────

export const bankingApi: IBankingPort = {
  async getBankRecords(shipId: string, year: number): Promise<BankRecords> {
    const res = await apiFetch<{ data: BankRecords }>(
      `/banking/records?shipId=${shipId}&year=${year}`
    );
    return res.data;
  },

  async bankSurplus(shipId: string, year: number, amount: number): Promise<BankActionResult> {
    const res = await apiFetch<{ data: BankActionResult }>('/banking/bank', {
      method: 'POST',
      body: JSON.stringify({ shipId, year, amount }),
    });
    return res.data;
  },

  async applyBanked(shipId: string, year: number, amount: number): Promise<BankActionResult> {
    const res = await apiFetch<{ data: BankActionResult }>('/banking/apply', {
      method: 'POST',
      body: JSON.stringify({ shipId, year, amount }),
    });
    return res.data;
  },
};

// ─── Pooling API ──────────────────────────────────────────────────────────────

export const poolingApi: IPoolingPort = {
  async getPools(year?: number): Promise<Pool[]> {
    const qs = year ? `?year=${year}` : '';
    const res = await apiFetch<{ data: Pool[] }>(`/pools${qs}`);
    return res.data;
  },

  async createPool(
    year: number,
    members: Array<{ shipId: string; cbOverride?: number }>
  ): Promise<Pool> {
    const res = await apiFetch<{ data: Pool }>('/pools', {
      method: 'POST',
      body: JSON.stringify({ year, members }),
    });
    return res.data;
  },
};
