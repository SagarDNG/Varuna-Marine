import { Router, Request, Response, NextFunction } from 'express';
import { GetAllRoutesUseCase, SetBaselineUseCase, GetComparisonUseCase } from '../../../../core/application/use-cases/routes.use-case';
import { IRouteRepository } from '../../../../core/ports/repositories';
import { Route } from '../../../../core/domain/entities';

export function createRoutesRouter(routeRepo: IRouteRepository): Router {
  const router = Router();
  const getAllRoutes = new GetAllRoutesUseCase(routeRepo);
  const setBaseline = new SetBaselineUseCase(routeRepo);
  const getComparison = new GetComparisonUseCase(routeRepo);

  // GET /routes
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const routes = await getAllRoutes.execute();
      let result = routes;
      const { vesselType, fuelType, year } = req.query;
      if (vesselType) result = result.filter((r: Route) => r.vesselType === vesselType);
      if (fuelType) result = result.filter((r: Route) => r.fuelType === fuelType);
      if (year) result = result.filter((r: Route) => r.year === Number(year));
      res.json({ data: result, total: result.length });
    } catch (err) { next(err); }
  });

  // GET /routes/comparison — must be registered BEFORE /:id to avoid param capture
  router.get('/comparison', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getComparison.execute();
      res.json({ data: result });
    } catch (err) { next(err); }
  });

  // POST /routes/:id/baseline
  router.post('/:id/baseline', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const route = await setBaseline.execute(req.params.id);
      res.json({ data: route, message: `Route ${route.routeId} set as baseline` });
    } catch (err) { next(err); }
  });

  return router;
}
