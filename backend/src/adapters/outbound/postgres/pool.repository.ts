import { Pool as PgPool } from 'pg';
import { PoolWithMembers } from '../../../core/domain/entities';
import { IPoolRepository } from '../../../core/ports/repositories';

function mapPoolWithMembers(
  poolRow: Record<string, unknown>,
  memberRows: Record<string, unknown>[]
): PoolWithMembers {
  const members = memberRows.map(m => ({
    poolId: m.pool_id as string,
    shipId: m.ship_id as string,
    cbBefore: Number(m.cb_before),
    cbAfter: Number(m.cb_after),
  }));

  return {
    id: poolRow.id as string,
    year: Number(poolRow.year),
    createdAt: new Date(poolRow.created_at as string),
    members,
    poolSum: members.reduce((s, m) => s + m.cbBefore, 0),
  };
}

export class PgPoolRepository implements IPoolRepository {
  constructor(private readonly db: PgPool) {}

  async createPool(
    year: number,
    members: Array<{ shipId: string; cbBefore: number; cbAfter: number }>
  ): Promise<PoolWithMembers> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const { rows: poolRows } = await client.query(
        'INSERT INTO pools (year) VALUES ($1) RETURNING *',
        [year]
      );
      const pool = poolRows[0];

      const memberRows: Record<string, unknown>[] = [];
      for (const m of members) {
        const { rows } = await client.query(
          'INSERT INTO pool_members (pool_id, ship_id, cb_before, cb_after) VALUES ($1, $2, $3, $4) RETURNING *',
          [pool.id, m.shipId, m.cbBefore, m.cbAfter]
        );
        memberRows.push(rows[0]);
      }

      await client.query('COMMIT');
      return mapPoolWithMembers(pool, memberRows);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findPool(poolId: string): Promise<PoolWithMembers | null> {
    const { rows: poolRows } = await this.db.query('SELECT * FROM pools WHERE id = $1', [poolId]);
    if (!poolRows.length) return null;

    const { rows: memberRows } = await this.db.query(
      'SELECT * FROM pool_members WHERE pool_id = $1',
      [poolId]
    );
    return mapPoolWithMembers(poolRows[0], memberRows);
  }

  async findAllPools(year?: number): Promise<PoolWithMembers[]> {
    const query = year
      ? 'SELECT * FROM pools WHERE year = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM pools ORDER BY created_at DESC';
    const params = year ? [year] : [];

    const { rows: poolRows } = await this.db.query(query, params);
    const results: PoolWithMembers[] = [];

    for (const poolRow of poolRows) {
      const { rows: memberRows } = await this.db.query(
        'SELECT * FROM pool_members WHERE pool_id = $1',
        [poolRow.id]
      );
      results.push(mapPoolWithMembers(poolRow, memberRows));
    }

    return results;
  }
}
