import {
  BankEntry,
  NegativeComplianceBalanceError,
  InsufficientBankBalanceError,
} from '../../domain/entities';
import { computeComplianceBalance } from '../../domain/formulas';
import { IBankRepository, IComplianceRepository, IRouteRepository } from '../../ports/repositories';

export class BankSurplusUseCase {
  constructor(
    private readonly bankRepo: IBankRepository,
    private readonly complianceRepo: IComplianceRepository,
    private readonly routeRepo: IRouteRepository,
  ) {}

  async execute(shipId: string, year: number, amount: number): Promise<{
    entry: BankEntry;
    cbBefore: number;
    cbAfter: number;
  }> {
    // Get current CB
    let compliance = await this.complianceRepo.findCompliance(shipId, year);
    if (!compliance) {
      const routes = await this.routeRepo.findAll();
      const shipRoutes = routes.filter(r => r.routeId === shipId && r.year === year);
      let totalCB = 0;
      for (const route of shipRoutes) {
        totalCB += computeComplianceBalance(route.ghgIntensity, route.fuelConsumption);
      }
      compliance = await this.complianceRepo.upsertCompliance({ shipId, year, cbGco2eq: totalCB });
    }

    if (compliance.cbGco2eq <= 0) {
      throw new NegativeComplianceBalanceError(shipId, compliance.cbGco2eq);
    }

    if (amount > compliance.cbGco2eq) {
      throw new InsufficientBankBalanceError(amount, compliance.cbGco2eq);
    }

    const entry = await this.bankRepo.createBankEntry({
      shipId,
      year,
      amountGco2eq: amount,
      remainingGco2eq: amount,
    });

    // Update compliance record
    const cbAfter = compliance.cbGco2eq - amount;
    await this.complianceRepo.upsertCompliance({
      shipId,
      year,
      cbGco2eq: cbAfter,
    });

    return {
      entry,
      cbBefore: compliance.cbGco2eq,
      cbAfter,
    };
  }
}

export class ApplyBankedUseCase {
  constructor(
    private readonly bankRepo: IBankRepository,
    private readonly complianceRepo: IComplianceRepository,
    private readonly routeRepo: IRouteRepository,
  ) {}

  async execute(shipId: string, year: number, amount: number): Promise<{
    cbBefore: number;
    applied: number;
    cbAfter: number;
  }> {
    const available = await this.bankRepo.getTotalAvailable(shipId, year);

    if (amount > available) {
      throw new InsufficientBankBalanceError(amount, available);
    }

    let compliance = await this.complianceRepo.findCompliance(shipId, year);
    if (!compliance) {
      const routes = await this.routeRepo.findAll();
      const shipRoutes = routes.filter(r => r.routeId === shipId && r.year === year);
      let totalCB = 0;
      for (const route of shipRoutes) {
        totalCB += computeComplianceBalance(route.ghgIntensity, route.fuelConsumption);
      }
      compliance = await this.complianceRepo.upsertCompliance({ shipId, year, cbGco2eq: totalCB });
    }

    await this.bankRepo.applyFromBank(shipId, year, amount);

    const cbAfter = compliance.cbGco2eq + amount;
    await this.complianceRepo.upsertCompliance({
      shipId,
      year,
      cbGco2eq: cbAfter,
    });

    return {
      cbBefore: compliance.cbGco2eq,
      applied: amount,
      cbAfter,
    };
  }
}

export class GetBankRecordsUseCase {
  constructor(private readonly bankRepo: IBankRepository) {}

  async execute(shipId: string, year: number): Promise<{
    entries: BankEntry[];
    totalBanked: number;
    totalAvailable: number;
  }> {
    const entries = await this.bankRepo.findBankEntries(shipId, year);
    const totalBanked = entries.reduce((s, e) => s + e.amountGco2eq, 0);
    const totalAvailable = await this.bankRepo.getTotalAvailable(shipId, year);

    return { entries, totalBanked, totalAvailable };
  }
}
