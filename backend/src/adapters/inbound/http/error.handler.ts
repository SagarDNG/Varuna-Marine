import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../../core/domain/entities';

const DOMAIN_ERROR_STATUS: Record<string, number> = {
  ROUTE_NOT_FOUND: 404,
  INSUFFICIENT_BANK_BALANCE: 422,
  NEGATIVE_CB_CANNOT_BANK: 422,
  INVALID_POOL: 422,
};

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof DomainError) {
    const status = DOMAIN_ERROR_STATUS[err.code] ?? 400;
    res.status(status).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  console.error('[UnhandledError]', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
