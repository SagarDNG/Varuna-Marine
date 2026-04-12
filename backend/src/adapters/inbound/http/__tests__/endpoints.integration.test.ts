import request from 'supertest';
import express from 'express';
import { createRoutesRouter } from '../routes/routes.handler';
import { createBankingRouter } from '../routes/banking.handler';
import { createPoolingRouter } from '../routes/pooling.handler';
import { errorHandler } from '../error.handler';
import type { Route, ShipCompliance, BankEntry, PoolWithMembers } from '../../../../core/domain/entities';
import type {
  IRouteRepository,
  IComplianceRepository,
  IBankRepository,
  IPoolRepository,
} from '../../../../core/ports/repositories';

// ─── In-memory mock repositories ─────────────────────────────────────────────

const seedRoutes: Route[] = [
  { id: 'id-1', routeId: 'R001', vesselType: 'Container', fuelType: 'HFO', year: 2024, ghgIntensity: 91.0, fuelConsumption: 5000, distance: 12000, totalEmissions: 4500, isBaseline: true, createdAt: new Date() },
  { id: 'id-2', routeId: 'R002', vesselType: 'BulkCarrier', fuelType: 'LNG', year: 2024, ghgIntensity: 88.0, fuelConsumption: 4800, distance: 11500, totalEmissions: 4200, isBaseline: false, createdAt: new Date() },
  { id: 'id-3', routeId: 'R003', vesselType: 'Tanker', fuelType: 'MGO', year: 2024, ghgIntensity: 93.5, fuelConsumption: 5100, distance: 12500, totalEmissions: 4700, isBaseline: false, createdAt: new Date() },
];

function makeRouteRepo(): IRouteRepository {
  let routes = [...seedRoutes];
  return {
    findAll: () => Promise.resolve(routes),
    findById: (id: string) => Promise.resolve(routes.find(r => r.id === id) ?? null),
    findByRouteId: (rid: string) => Promise.resolve(routes.find(r => r.routeId === rid) ?? null),
    findBaseline: () => Promise.resolve(routes.find(r => r.isBaseline) ?? null),
    setBaseline: (id: string) => {
      routes = routes.map(r => ({ ...r, isBaseline: r.id === id }));
      return Promise.resolve(routes.find(r => r.id === id)!);
    },
    findAllExceptBaseline: () => Promise.resolve(routes.filter(r => !r.isBaseline)),
  };
}

function makeComplianceRepo(): IComplianceRepository {
  const store: Map<string, ShipCompliance> = new Map();
  return {
    findCompliance: (shipId: string, year: number) => Promise.resolve(store.get(`${shipId}:${year}`) ?? null),
    upsertCompliance: (rec: Omit<ShipCompliance, 'id' | 'computedAt'>) => {
      const record: ShipCompliance = { id: 'comp-id', computedAt: new Date(), ...rec };
      store.set(`${rec.shipId}:${rec.year}`, record);
      return Promise.resolve(record);
    },
  };
}

function makeBankRepo(): IBankRepository {
  const entries: BankEntry[] = [];
  return {
    createBankEntry: (e: Omit<BankEntry, 'id' | 'createdAt'>) => {
      const entry: BankEntry = { id: `bank-${Date.now()}`, createdAt: new Date(), ...e };
      entries.push(entry);
      return Promise.resolve(entry);
    },
    findBankEntries: (shipId: string, year: number) =>
      Promise.resolve(entries.filter(e => e.shipId === shipId && e.year === year)),
    getTotalAvailable: (shipId: string, year: number) =>
      Promise.resolve(
        entries.filter(e => e.shipId === shipId && e.year === year)
          .reduce((s, e) => s + e.remainingGco2eq, 0)
      ),
    applyFromBank: async (shipId: string, year: number, amount: number) => {
      let rem = amount;
      for (const e of entries.filter(e => e.shipId === shipId && e.year === year)) {
        if (rem <= 0) break;
        const use = Math.min(e.remainingGco2eq, rem);
        e.remainingGco2eq -= use;
        rem -= use;
      }
    },
  };
}

function makePoolRepo(): IPoolRepository {
  const pools: PoolWithMembers[] = [];
  return {
    createPool: (year: number, members: Array<{ shipId: string; cbBefore: number; cbAfter: number }>) => {
      const pool: PoolWithMembers = {
        id: `pool-${Date.now()}`,
        year,
        createdAt: new Date(),
        members: members.map(m => ({ poolId: 'pool-id', ...m })),
        poolSum: members.reduce((s, m) => s + m.cbBefore, 0),
      };
      pools.push(pool);
      return Promise.resolve(pool);
    },
    findPool: (id: string) => Promise.resolve(pools.find(p => p.id === id) ?? null),
    findAllPools: (year?: number) => Promise.resolve(year ? pools.filter(p => p.year === year) : pools),
  };
}

// ─── Build test app ───────────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(express.json());

  const routeRepo = makeRouteRepo();
  const complianceRepo = makeComplianceRepo();
  const bankRepo = makeBankRepo();
  const poolRepo = makePoolRepo();

  app.use('/routes', createRoutesRouter(routeRepo));
  app.use('/banking', createBankingRouter(bankRepo, complianceRepo, routeRepo));
  app.use('/pools', createPoolingRouter(poolRepo, complianceRepo, routeRepo));
  app.use(errorHandler);

  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /routes', () => {
  const app = buildApp();

  it('returns all routes', async () => {
    const res = await request(app).get('/routes');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.total).toBe(3);
  });

  it('filters by vesselType', async () => {
    const res = await request(app).get('/routes?vesselType=Container');
    expect(res.status).toBe(200);
    expect(res.body.data.every((r: Route) => r.vesselType === 'Container')).toBe(true);
  });

  it('filters by year', async () => {
    const res = await request(app).get('/routes?year=2024');
    expect(res.status).toBe(200);
    expect(res.body.data.every((r: Route) => r.year === 2024)).toBe(true);
  });
});

describe('POST /routes/:id/baseline', () => {
  it('sets a route as baseline', async () => {
    const app = buildApp();
    const res = await request(app).post('/routes/id-2/baseline');
    expect(res.status).toBe(200);
    expect(res.body.data.isBaseline).toBe(true);
    expect(res.body.data.routeId).toBe('R002');
  });

  it('returns 404 for unknown route id', async () => {
    const app = buildApp();
    const res = await request(app).post('/routes/does-not-exist/baseline');
    expect(res.status).toBe(404);
  });
});

describe('GET /routes/comparison', () => {
  it('returns baseline and comparison data', async () => {
    const app = buildApp();
    const res = await request(app).get('/routes/comparison');
    expect(res.status).toBe(200);
    expect(res.body.data.baseline).toBeDefined();
    expect(Array.isArray(res.body.data.comparisons)).toBe(true);
  });
});

describe('POST /banking/bank', () => {
  it('banks surplus for a ship', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/banking/bank')
      .send({ shipId: 'R002', year: 2024, amount: 100_000 });
    expect(res.status).toBe(201);
    expect(res.body.data.entry).toBeDefined();
  });

  it('returns 400 when amount is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/banking/bank')
      .send({ shipId: 'R002', year: 2024 });
    expect(res.status).toBe(400);
  });
});

describe('POST /pools', () => {
  it('creates a valid pool', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/pools')
      .send({
        year: 2024,
        members: [
          { shipId: 'S1', cbOverride: 1_000_000 },
          { shipId: 'S2', cbOverride: -400_000 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.members).toHaveLength(2);
  });

  it('returns 422 when pool sum is negative', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/pools')
      .send({
        year: 2024,
        members: [
          { shipId: 'S1', cbOverride: -1_000_000 },
          { shipId: 'S2', cbOverride: -400_000 },
        ],
      });
    expect(res.status).toBe(422);
  });

  it('returns 400 with fewer than 2 members', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/pools')
      .send({ year: 2024, members: [{ shipId: 'S1', cbOverride: 500_000 }] });
    expect(res.status).toBe(400);
  });
});
