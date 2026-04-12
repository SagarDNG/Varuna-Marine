import { Pool as PgPool } from 'pg';
import { BankEntry } from '../../../core/domain/entities';
import { IBankRepository } from '../../../core/ports/repositories';

function mapRow(row: Record<string, unknown>): BankEntry {
  return {
    id: row.id as string,
    shipId: row.ship_id as string,
    year: Number(row.year),
    amountGco2eq: Number(row.amount_gco2eq),
    remainingGco2eq: Number(row.remaining_gco2eq),
    createdAt: new Date(row.created_at as string),
  };
}

export class PgBankRepository implements IBankRepository {
  constructor(private readonly db: PgPool) {}

  async createBankEntry(entry: Omit<BankEntry, 'id' | 'createdAt'>): Promise<BankEntry> {
    const { rows } = await this.db.query(
      `INSERT INTO bank_entries (ship_id, year, amount_gco2eq, remaining_gco2eq)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [entry.shipId, entry.year, entry.amountGco2eq, entry.remainingGco2eq]
    );
    return mapRow(rows[0]);
  }

  async findBankEntries(shipId: string, year: number): Promise<BankEntry[]> {
    const { rows } = await this.db.query(
      'SELECT * FROM bank_entries WHERE ship_id = $1 AND year = $2 ORDER BY created_at',
      [shipId, year]
    );
    return rows.map(mapRow);
  }

  async getTotalAvailable(shipId: string, year: number): Promise<number> {
    const { rows } = await this.db.query(
      'SELECT COALESCE(SUM(remaining_gco2eq), 0) as total FROM bank_entries WHERE ship_id = $1 AND year = $2',
      [shipId, year]
    );
    return Number(rows[0].total);
  }

  async applyFromBank(shipId: string, year: number, amount: number): Promise<void> {
    // Apply FIFO: oldest entries first
    const entries = await this.findBankEntries(shipId, year);
    let remaining = amount;

    for (const entry of entries) {
      if (remaining <= 0) break;
      if (entry.remainingGco2eq <= 0) continue;

      const use = Math.min(entry.remainingGco2eq, remaining);
      const newRemaining = entry.remainingGco2eq - use;

      await this.db.query(
        'UPDATE bank_entries SET remaining_gco2eq = $1 WHERE id = $2',
        [newRemaining, entry.id]
      );

      remaining -= use;
    }
  }
}
