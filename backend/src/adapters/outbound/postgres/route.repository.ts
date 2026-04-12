import { Pool as PgPool } from 'pg';
import { Route } from '../../../core/domain/entities';
import { IRouteRepository } from '../../../core/ports/repositories';

function mapRow(row: Record<string, unknown>): Route {
  return {
    id: row.id as string,
    routeId: row.route_id as string,
    vesselType: row.vessel_type as Route['vesselType'],
    fuelType: row.fuel_type as Route['fuelType'],
    year: Number(row.year),
    ghgIntensity: Number(row.ghg_intensity),
    fuelConsumption: Number(row.fuel_consumption),
    distance: Number(row.distance),
    totalEmissions: Number(row.total_emissions),
    isBaseline: Boolean(row.is_baseline),
    createdAt: new Date(row.created_at as string),
  };
}

export class PgRouteRepository implements IRouteRepository {
  constructor(private readonly db: PgPool) {}

  async findAll(): Promise<Route[]> {
    const { rows } = await this.db.query('SELECT * FROM routes ORDER BY year, route_id');
    return rows.map(mapRow);
  }

  async findById(id: string): Promise<Route | null> {
    const { rows } = await this.db.query('SELECT * FROM routes WHERE id = $1', [id]);
    return rows.length ? mapRow(rows[0]) : null;
  }

  async findByRouteId(routeId: string): Promise<Route | null> {
    const { rows } = await this.db.query('SELECT * FROM routes WHERE route_id = $1', [routeId]);
    return rows.length ? mapRow(rows[0]) : null;
  }

  async findBaseline(): Promise<Route | null> {
    const { rows } = await this.db.query('SELECT * FROM routes WHERE is_baseline = TRUE LIMIT 1');
    return rows.length ? mapRow(rows[0]) : null;
  }

  async setBaseline(id: string): Promise<Route> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE routes SET is_baseline = FALSE');
      const { rows } = await client.query(
        'UPDATE routes SET is_baseline = TRUE WHERE id = $1 RETURNING *',
        [id]
      );
      await client.query('COMMIT');
      return mapRow(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findAllExceptBaseline(): Promise<Route[]> {
    const { rows } = await this.db.query(
      'SELECT * FROM routes WHERE is_baseline = FALSE ORDER BY year, route_id'
    );
    return rows.map(mapRow);
  }
}
