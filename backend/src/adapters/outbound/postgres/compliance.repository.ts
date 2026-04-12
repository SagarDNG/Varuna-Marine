import { Pool as PgPool } from 'pg';
import { ShipCompliance } from '../../../core/domain/entities';
import { IComplianceRepository } from '../../../core/ports/repositories';

function mapRow(row: Record<string, unknown>): ShipCompliance {
  return {
    id: row.id as string,
    shipId: row.ship_id as string,
    year: Number(row.year),
    cbGco2eq: Number(row.cb_gco2eq),
    computedAt: new Date(row.computed_at as string),
  };
}

export class PgComplianceRepository implements IComplianceRepository {
  constructor(private readonly db: PgPool) {}

  async upsertCompliance(record: Omit<ShipCompliance, 'id' | 'computedAt'>): Promise<ShipCompliance> {
    const { rows } = await this.db.query(
      `INSERT INTO ship_compliance (ship_id, year, cb_gco2eq, computed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (ship_id, year)
       DO UPDATE SET cb_gco2eq = EXCLUDED.cb_gco2eq, computed_at = NOW()
       RETURNING *`,
      [record.shipId, record.year, record.cbGco2eq]
    );
    return mapRow(rows[0]);
  }

  async findCompliance(shipId: string, year: number): Promise<ShipCompliance | null> {
    const { rows } = await this.db.query(
      'SELECT * FROM ship_compliance WHERE ship_id = $1 AND year = $2',
      [shipId, year]
    );
    return rows.length ? mapRow(rows[0]) : null;
  }
}
