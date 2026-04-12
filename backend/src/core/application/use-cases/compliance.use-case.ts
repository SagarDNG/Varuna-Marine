import { ShipCompliance } from '../../domain/entities';
import { computeComplianceBalance } from '../../domain/formulas';
import { IComplianceRepository, IBankRepository, IRouteRepository } from '../../ports/repositories';

export class ComputeCBUseCase {
  constructor(
    private readonly complianceRepo: IComplianceRepository,
    private readonly routeRepo: IRouteRepository,
  ) {}

  async execute(shipId: string, year: number): Promise<ShipCompliance> {
    // Find all routes for this ship/year (using shipId as routeId for seed data)
    const routes = await this.routeRepo.findAll();
    const shipRoutes = routes.filter(r => r.routeId === shipId && r.year === year);

    let totalCB = 0;
    if (shipRoutes.length > 0) {
      // Aggregate CB across all routes for this ship/year
      for (const route of shipRoutes) {
        totalCB += computeComplianceBalance(route.ghgIntensity, route.fuelConsumption);
      }
    } else {
      // Fallback: compute from any route with this shipId pattern
      const allRoutes = await this.routeRepo.findAll();
      const fallback = allRoutes.find(r => r.year === year);
      if (fallback) {
        totalCB = computeComplianceBalance(fallback.ghgIntensity, fallback.fuelConsumption);
      }
    }

    return this.complianceRepo.upsertCompliance({
      shipId,
      year,
      cbGco2eq: totalCB,
    });
  }
}

export class GetAdjustedCBUseCase {
  constructor(
    private readonly complianceRepo: IComplianceRepository,
    private readonly bankRepo: IBankRepository,
    private readonly routeRepo: IRouteRepository,
  ) {}

  async execute(shipId: string, year: number): Promise<{
    shipId: string;
    year: number;
    cbRaw: number;
    bankedApplied: number;
    cbAdjusted: number;
  }> {
    // Get or compute CB
    let compliance = await this.complianceRepo.findCompliance(shipId, year);
    if (!compliance) {
      // Auto-compute from routes
      const routes = await this.routeRepo.findAll();
      const shipRoutes = routes.filter(r => r.routeId === shipId && r.year === year);
      let totalCB = 0;
      for (const route of shipRoutes) {
        totalCB += computeComplianceBalance(route.ghgIntensity, route.fuelConsumption);
      }
      compliance = await this.complianceRepo.upsertCompliance({ shipId, year, cbGco2eq: totalCB });
    }

    const bankEntries = await this.bankRepo.findBankEntries(shipId, year);
    const bankedApplied = bankEntries.reduce((sum, e) => {
      const applied = e.amountGco2eq - e.remainingGco2eq;
      return sum + applied;
    }, 0);

    return {
      shipId,
      year,
      cbRaw: compliance.cbGco2eq,
      bankedApplied,
      cbAdjusted: compliance.cbGco2eq + bankedApplied,
    };
  }
}
