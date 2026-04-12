import { Router, Request, Response, NextFunction } from 'express';
import { CreatePoolUseCase, GetPoolsUseCase } from '../../../../core/application/use-cases/pooling.use-case';
import { IPoolRepository, IComplianceRepository, IRouteRepository } from '../../../../core/ports/repositories';

export function createPoolingRouter(
  poolRepo: IPoolRepository,
  complianceRepo: IComplianceRepository,
  routeRepo: IRouteRepository,
): Router {
  const router = Router();
  const createPool = new CreatePoolUseCase(poolRepo, complianceRepo, routeRepo);
  const getPools = new GetPoolsUseCase(poolRepo);

  // GET /pools?year=
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const pools = await getPools.execute(year);
      res.json({ data: pools, total: pools.length });
    } catch (err) { next(err); }
  });

  // POST /pools
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { year, members } = req.body;
      if (!year || !members || !Array.isArray(members)) {
        res.status(400).json({ error: 'year and members array are required' });
        return;
      }
      if (members.length < 2) {
        res.status(400).json({ error: 'Pool must have at least 2 members' });
        return;
      }
      for (const m of members) {
        if (!m.shipId) {
          res.status(400).json({ error: 'Each member must have a shipId' });
          return;
        }
      }
      const pool = await createPool.execute(Number(year), members);
      res.status(201).json({ data: pool, message: `Pool created with ${pool.members.length} members` });
    } catch (err) { next(err); }
  });

  return router;
}
