import { Router, Request, Response, NextFunction } from 'express';
import { ComputeCBUseCase, GetAdjustedCBUseCase } from '../../../../core/application/use-cases/compliance.use-case';
import { IComplianceRepository, IBankRepository, IRouteRepository } from '../../../../core/ports/repositories';

export function createComplianceRouter(
  complianceRepo: IComplianceRepository,
  bankRepo: IBankRepository,
  routeRepo: IRouteRepository,
): Router {
  const router = Router();
  const computeCB = new ComputeCBUseCase(complianceRepo, routeRepo);
  const getAdjustedCB = new GetAdjustedCBUseCase(complianceRepo, bankRepo, routeRepo);

  // GET /compliance/cb?shipId=&year=
  router.get('/cb', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shipId, year } = req.query;
      if (!shipId || !year) {
        res.status(400).json({ error: 'shipId and year are required' });
        return;
      }
      const result = await computeCB.execute(String(shipId), Number(year));
      res.json({ data: result });
    } catch (err) { next(err); }
  });

  // GET /compliance/adjusted-cb?shipId=&year=
  router.get('/adjusted-cb', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shipId, year } = req.query;
      if (!shipId || !year) {
        res.status(400).json({ error: 'shipId and year are required' });
        return;
      }
      const result = await getAdjustedCB.execute(String(shipId), Number(year));
      res.json({ data: result });
    } catch (err) { next(err); }
  });

  return router;
}
