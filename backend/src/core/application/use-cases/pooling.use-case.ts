import { PoolWithMembers, InvalidPoolError } from '../../domain/entities';
import { allocatePool } from '../../domain/formulas';
import { IPoolRepository, IComplianceRepository, IRouteRepository } from '../../ports/repositories';
import { computeComplianceBalance } from '../../domain/formulas';

export interface PoolMemberInput {
  shipId: string;
  cbOverride?: number; // optional manual CB, otherwise fetched from compliance
}

export class CreatePoolUseCase {
  constructor(
    private readonly poolRepo: IPoolRepository,
    private readonly complianceRepo: IComplianceRepository,
    private readonly routeRepo: IRouteRepository,
  ) {}

  async execute(year: number, memberInputs: PoolMemberInput[]): Promise<PoolWithMembers> {
    if (memberInputs.length < 2) {
      throw new InvalidPoolError('Pool must have at least 2 members');
    }

    // Resolve CB for each member
    const membersWithCB: Array<{ shipId: string; cbBefore: number }> = [];
    for (const input of memberInputs) {
      let cb = input.cbOverride;
      if (cb === undefined) {
        const compliance = await this.complianceRepo.findCompliance(input.shipId, year);
        if (!compliance) {
          // compute from routes
          const routes = await this.routeRepo.findAll();
          const shipRoutes = routes.filter(r => r.routeId === input.shipId && r.year === year);
          let totalCB = 0;
          for (const route of shipRoutes) {
            totalCB += computeComplianceBalance(route.ghgIntensity, route.fuelConsumption);
          }
          cb = totalCB;
        } else {
          cb = compliance.cbGco2eq;
        }
      }
      membersWithCB.push({ shipId: input.shipId, cbBefore: cb });
    }

    // Validate: sum(CB) >= 0
    const poolSum = membersWithCB.reduce((s, m) => s + m.cbBefore, 0);
    if (poolSum < 0) {
      throw new InvalidPoolError(
        `Sum of compliance balances is ${poolSum.toFixed(2)} gCO₂e — must be ≥ 0`
      );
    }

    // Allocate using greedy algorithm
    const allocated = allocatePool(membersWithCB);

    // Validate post-allocation rules per FuelEU Article 21:
    // - Deficit ships cannot exit worse than they entered
    // - Surplus ships cannot exit negative
    for (const m of allocated) {
      const before = membersWithCB.find(x => x.shipId === m.shipId)!;
      if (before.cbBefore < 0 && m.cbAfter < before.cbBefore) {
        throw new InvalidPoolError(
          `Deficit ship ${m.shipId} would exit worse: ${before.cbBefore.toFixed(2)} → ${m.cbAfter.toFixed(2)}`
        );
      }
      if (before.cbBefore > 0 && m.cbAfter < 0) {
        throw new InvalidPoolError(
          `Surplus ship ${m.shipId} cannot exit negative: would be ${m.cbAfter.toFixed(2)} gCO₂e`
        );
      }
    }

    return this.poolRepo.createPool(year, allocated);
  }
}

export class GetPoolsUseCase {
  constructor(private readonly poolRepo: IPoolRepository) {}

  async execute(year?: number): Promise<PoolWithMembers[]> {
    return this.poolRepo.findAllPools(year);
  }
}
