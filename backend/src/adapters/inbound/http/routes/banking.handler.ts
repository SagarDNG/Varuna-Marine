import { Router, Request, Response, NextFunction } from 'express';
import {
  BankSurplusUseCase,
  ApplyBankedUseCase,
  GetBankRecordsUseCase,
} from '../../../../core/application/use-cases/banking.use-case';
import { IBankRepository, IComplianceRepository, IRouteRepository } from '../../../../core/ports/repositories';

export function createBankingRouter(
  bankRepo: IBankRepository,
  complianceRepo: IComplianceRepository,
  routeRepo: IRouteRepository,
): Router {
  const router = Router();
  const bankSurplus = new BankSurplusUseCase(bankRepo, complianceRepo, routeRepo);
  const applyBanked = new ApplyBankedUseCase(bankRepo, complianceRepo, routeRepo);
  const getRecords = new GetBankRecordsUseCase(bankRepo);

  // GET /banking/records?shipId=&year=
  router.get('/records', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shipId, year } = req.query;
      if (!shipId || !year) {
        res.status(400).json({ error: 'shipId and year are required' });
        return;
      }
      const result = await getRecords.execute(String(shipId), Number(year));
      res.json({ data: result });
    } catch (err) { next(err); }
  });

  // POST /banking/bank
  router.post('/bank', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shipId, year, amount } = req.body;
      if (!shipId || !year || amount === undefined) {
        res.status(400).json({ error: 'shipId, year, and amount are required' });
        return;
      }
      if (amount <= 0) {
        res.status(400).json({ error: 'amount must be positive' });
        return;
      }
      const result = await bankSurplus.execute(String(shipId), Number(year), Number(amount));
      res.status(201).json({ data: result, message: `Banked ${amount} gCO₂e for ship ${shipId}` });
    } catch (err) { next(err); }
  });

  // POST /banking/apply
  router.post('/apply', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shipId, year, amount } = req.body;
      if (!shipId || !year || amount === undefined) {
        res.status(400).json({ error: 'shipId, year, and amount are required' });
        return;
      }
      if (amount <= 0) {
        res.status(400).json({ error: 'amount must be positive' });
        return;
      }
      const result = await applyBanked.execute(String(shipId), Number(year), Number(amount));
      res.json({ data: result, message: `Applied ${result.applied.toFixed(2)} gCO₂e from bank for ship ${shipId}` });
    } catch (err) { next(err); }
  });

  return router;
}
