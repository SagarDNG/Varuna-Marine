import { Route, ComparisonResult, RouteNotFoundError } from '../../domain/entities';
import { computePercentDiff, isCompliant } from '../../domain/formulas';
import { IRouteRepository } from '../../ports/repositories';

export class GetAllRoutesUseCase {
  constructor(private readonly routeRepo: IRouteRepository) {}

  async execute(): Promise<Route[]> {
    return this.routeRepo.findAll();
  }
}

export class SetBaselineUseCase {
  constructor(private readonly routeRepo: IRouteRepository) {}

  async execute(id: string): Promise<Route> {
    const route = await this.routeRepo.findById(id);
    if (!route) throw new RouteNotFoundError(id);
    return this.routeRepo.setBaseline(id);
  }
}

export class GetComparisonUseCase {
  constructor(private readonly routeRepo: IRouteRepository) {}

  async execute(): Promise<{ baseline: Route; comparisons: ComparisonResult[] }> {
    const baseline = await this.routeRepo.findBaseline();
    if (!baseline) {
      throw new RouteNotFoundError('baseline');
    }

    const others = await this.routeRepo.findAllExceptBaseline();

    const comparisons: ComparisonResult[] = others.map(route => ({
      baselineRoute: baseline,
      comparisonRoute: route,
      percentDiff: computePercentDiff(baseline.ghgIntensity, route.ghgIntensity),
      compliant: isCompliant(route.ghgIntensity),
    }));

    return { baseline, comparisons };
  }
}
