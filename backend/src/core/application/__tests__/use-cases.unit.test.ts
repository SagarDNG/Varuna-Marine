import { ComputeCBUseCase } from '../../application/use-cases/compliance.use-case';
import { BankSurplusUseCase, ApplyBankedUseCase } from '../../application/use-cases/banking.use-case';
import { CreatePoolUseCase } from '../../application/use-cases/pooling.use-case';
import { GetComparisonUseCase } from '../../application/use-cases/routes.use-case';
import {
  IRouteRepository,
  IComplianceRepository,
  IBankRepository,
  IPoolRepository,
} from '../../ports/repositories';
import { Route, ShipCompliance, BankEntry, PoolWithMembers } from '../../domain/entities';

// ─── Mock Factories ───────────────────────────────────────────────────────────

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: 'uuid-1',
    routeId: 'R001',
    vesselType: 'Container',
    fuelType: 'HFO',
    year: 2024,
    ghgIntensity: 88.0,
    fuelConsumption: 4800,
    distance: 11500,
    totalEmissions: 4200,
    isBaseline: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeCompliance(overrides: Partial<ShipCompliance> = {}): ShipCompliance {
  return {
    id: 'uuid-c1',
    shipId: 'R001',
    year: 2024,
    cbGco2eq: 263_059_200,
    computedAt: new Date(),
    ...overrides,
  };
}

function mockRouteRepo(routes: Route[]): IRouteRepository {
  return {
    findAll: jest.fn().mockResolvedValue(routes),
    findById: jest.fn().mockResolvedValue(routes[0] ?? null),
    findByRouteId: jest.fn().mockResolvedValue(routes[0] ?? null),
    findBaseline: jest.fn().mockResolvedValue(routes.find(r => r.isBaseline) ?? null),
    setBaseline: jest.fn().mockResolvedValue({ ...routes[0], isBaseline: true }),
    findAllExceptBaseline: jest.fn().mockResolvedValue(routes.filter(r => !r.isBaseline)),
  };
}

function mockComplianceRepo(existing: ShipCompliance | null = null): IComplianceRepository {
  return {
    findCompliance: jest.fn().mockResolvedValue(existing),
    upsertCompliance: jest.fn().mockImplementation((rec) =>
      Promise.resolve({ id: 'uuid-new', computedAt: new Date(), ...rec })
    ),
  };
}

function mockBankRepo(entries: BankEntry[] = [], available = 0): IBankRepository {
  return {
    createBankEntry: jest.fn().mockImplementation((e) =>
      Promise.resolve({ id: 'uuid-bank', createdAt: new Date(), ...e })
    ),
    findBankEntries: jest.fn().mockResolvedValue(entries),
    getTotalAvailable: jest.fn().mockResolvedValue(available),
    applyFromBank: jest.fn().mockResolvedValue(undefined),
  };
}

function mockPoolRepo(): IPoolRepository {
  return {
    createPool: jest.fn().mockImplementation((year, members) =>
      Promise.resolve({
        id: 'pool-uuid',
        year,
        createdAt: new Date(),
        members: members.map((m: { shipId: string; cbBefore: number; cbAfter: number }) => ({
          poolId: 'pool-uuid',
          ...m,
        })),
        poolSum: members.reduce((s: number, m: { cbBefore: number }) => s + m.cbBefore, 0),
      } as PoolWithMembers)
    ),
    findPool: jest.fn().mockResolvedValue(null),
    findAllPools: jest.fn().mockResolvedValue([]),
  };
}

// ─── ComputeCB Use Case ───────────────────────────────────────────────────────

describe('ComputeCBUseCase', () => {
  it('computes and stores compliance balance for a ship/year', async () => {
    const route = makeRoute({ routeId: 'R001', year: 2024, ghgIntensity: 88.0, fuelConsumption: 4800 });
    const routeRepo = mockRouteRepo([route]);
    const complianceRepo = mockComplianceRepo();

    const useCase = new ComputeCBUseCase(complianceRepo, routeRepo);
    const result = await useCase.execute('R001', 2024);

    expect(complianceRepo.upsertCompliance).toHaveBeenCalled();
    expect(result.shipId).toBe('R001');
    expect(result.year).toBe(2024);
    expect(result.cbGco2eq).toBeGreaterThan(0); // 88.0 < 89.3368, so positive surplus
  });
});

// ─── BankSurplus Use Case ─────────────────────────────────────────────────────

describe('BankSurplusUseCase', () => {
  it('banks surplus CB and reduces compliance record', async () => {
    const compliance = makeCompliance({ cbGco2eq: 500_000 });
    const routeRepo = mockRouteRepo([makeRoute()]);
    const complianceRepo = mockComplianceRepo(compliance);
    const bankRepo = mockBankRepo();

    const useCase = new BankSurplusUseCase(bankRepo, complianceRepo, routeRepo);
    const result = await useCase.execute('R001', 2024, 200_000);

    expect(bankRepo.createBankEntry).toHaveBeenCalledWith(
      expect.objectContaining({ amountGco2eq: 200_000, remainingGco2eq: 200_000 })
    );
    expect(result.cbBefore).toBe(500_000);
    expect(result.cbAfter).toBe(300_000);
  });

  it('throws when trying to bank more than available CB', async () => {
    const compliance = makeCompliance({ cbGco2eq: 100_000 });
    const routeRepo = mockRouteRepo([makeRoute()]);
    const complianceRepo = mockComplianceRepo(compliance);
    const bankRepo = mockBankRepo();

    const useCase = new BankSurplusUseCase(bankRepo, complianceRepo, routeRepo);

    await expect(useCase.execute('R001', 2024, 200_000)).rejects.toThrow(/only 100000/);
  });

  it('throws when CB is negative', async () => {
    const compliance = makeCompliance({ cbGco2eq: -50_000 });
    const routeRepo = mockRouteRepo([makeRoute()]);
    const complianceRepo = mockComplianceRepo(compliance);
    const bankRepo = mockBankRepo();

    const useCase = new BankSurplusUseCase(bankRepo, complianceRepo, routeRepo);

    await expect(useCase.execute('R001', 2024, 10_000)).rejects.toThrow(/negative CB/);
  });
});

// ─── ApplyBanked Use Case ─────────────────────────────────────────────────────

describe('ApplyBankedUseCase', () => {
  it('applies banked amount to compliance deficit', async () => {
    const compliance = makeCompliance({ cbGco2eq: -300_000 });
    const routeRepo = mockRouteRepo([makeRoute()]);
    const complianceRepo = mockComplianceRepo(compliance);
    const bankRepo = mockBankRepo([], 500_000);

    const useCase = new ApplyBankedUseCase(bankRepo, complianceRepo, routeRepo);
    const result = await useCase.execute('R001', 2024, 300_000);

    expect(bankRepo.applyFromBank).toHaveBeenCalledWith('R001', 2024, 300_000);
    expect(result.applied).toBe(300_000);
    expect(result.cbAfter).toBe(0);
  });

  it('throws when trying to apply more than available bank balance', async () => {
    const compliance = makeCompliance({ cbGco2eq: -500_000 });
    const routeRepo = mockRouteRepo([makeRoute()]);
    const complianceRepo = mockComplianceRepo(compliance);
    const bankRepo = mockBankRepo([], 100_000); // only 100k available

    const useCase = new ApplyBankedUseCase(bankRepo, complianceRepo, routeRepo);

    await expect(useCase.execute('R001', 2024, 300_000)).rejects.toThrow(/only 100000/);
  });
});

// ─── CreatePool Use Case ──────────────────────────────────────────────────────

describe('CreatePoolUseCase', () => {
  it('creates a pool with valid members', async () => {
    const routeRepo = mockRouteRepo([]);
    const complianceRepo = mockComplianceRepo();
    const poolRepo = mockPoolRepo();

    const useCase = new CreatePoolUseCase(poolRepo, complianceRepo, routeRepo);
    const pool = await useCase.execute(2024, [
      { shipId: 'S1', cbOverride: 1_000_000 },
      { shipId: 'S2', cbOverride: -400_000 },
    ]);

    expect(poolRepo.createPool).toHaveBeenCalled();
    expect(pool.members).toHaveLength(2);
  });

  it('throws when pool sum is negative', async () => {
    const routeRepo = mockRouteRepo([]);
    const complianceRepo = mockComplianceRepo();
    const poolRepo = mockPoolRepo();

    const useCase = new CreatePoolUseCase(poolRepo, complianceRepo, routeRepo);

    await expect(
      useCase.execute(2024, [
        { shipId: 'S1', cbOverride: -1_000_000 },
        { shipId: 'S2', cbOverride: -400_000 },
      ])
    ).rejects.toThrow(/must be ≥ 0/);
  });

  it('throws with fewer than 2 members', async () => {
    const routeRepo = mockRouteRepo([]);
    const complianceRepo = mockComplianceRepo();
    const poolRepo = mockPoolRepo();

    const useCase = new CreatePoolUseCase(poolRepo, complianceRepo, routeRepo);

    await expect(
      useCase.execute(2024, [{ shipId: 'S1', cbOverride: 500_000 }])
    ).rejects.toThrow(/at least 2/);
  });
});

// ─── GetComparison Use Case ───────────────────────────────────────────────────

describe('GetComparisonUseCase', () => {
  it('returns comparison results with percentDiff and compliant flags', async () => {
    const baseline = makeRoute({ routeId: 'R001', isBaseline: true, ghgIntensity: 91.0 });
    const other1 = makeRoute({ routeId: 'R002', isBaseline: false, ghgIntensity: 88.0 });
    const other2 = makeRoute({ routeId: 'R003', isBaseline: false, ghgIntensity: 93.5 });

    const routeRepo = mockRouteRepo([baseline, other1, other2]);

    const useCase = new GetComparisonUseCase(routeRepo);
    const result = await useCase.execute();

    expect(result.baseline.routeId).toBe('R001');
    expect(result.comparisons).toHaveLength(2);

    const r2 = result.comparisons.find(c => c.comparisonRoute.routeId === 'R002')!;
    expect(r2.compliant).toBe(true);  // 88.0 <= 89.3368
    expect(r2.percentDiff).toBeLessThan(0); // lower than baseline

    const r3 = result.comparisons.find(c => c.comparisonRoute.routeId === 'R003')!;
    expect(r3.compliant).toBe(false); // 93.5 > 89.3368
    expect(r3.percentDiff).toBeGreaterThan(0);
  });

  it('throws RouteNotFoundError when no baseline exists', async () => {
    const routeRepo = mockRouteRepo([makeRoute({ isBaseline: false })]);

    const useCase = new GetComparisonUseCase(routeRepo);

    await expect(useCase.execute()).rejects.toThrow('baseline');
  });
});
