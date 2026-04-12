import express from 'express';
import cors from 'cors';
import { Pool as PgPool } from 'pg';

import { PgRouteRepository } from '../../adapters/outbound/postgres/route.repository';
import { PgComplianceRepository } from '../../adapters/outbound/postgres/compliance.repository';
import { PgBankRepository } from '../../adapters/outbound/postgres/bank.repository';
import { PgPoolRepository } from '../../adapters/outbound/postgres/pool.repository';

import { createRoutesRouter } from '../../adapters/inbound/http/routes/routes.handler';
import { createComplianceRouter } from '../../adapters/inbound/http/routes/compliance.handler';
import { createBankingRouter } from '../../adapters/inbound/http/routes/banking.handler';
import { createPoolingRouter } from '../../adapters/inbound/http/routes/pooling.handler';
import { errorHandler } from '../../adapters/inbound/http/error.handler';

export function createApp(db: PgPool) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // ── Outbound adapters (repositories) ────────────────────────────────────────
  const routeRepo = new PgRouteRepository(db);
  const complianceRepo = new PgComplianceRepository(db);
  const bankRepo = new PgBankRepository(db);
  const poolRepo = new PgPoolRepository(db);

  // ── Inbound adapters (HTTP routes) ───────────────────────────────────────────
  app.use('/routes', createRoutesRouter(routeRepo));
  app.use('/compliance', createComplianceRouter(complianceRepo, bankRepo, routeRepo));
  app.use('/banking', createBankingRouter(bankRepo, complianceRepo, routeRepo));
  app.use('/pools', createPoolingRouter(poolRepo, complianceRepo, routeRepo));

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use(errorHandler);

  return app;
}
