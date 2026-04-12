import pool from './pool';

const migrations = [
  `
  CREATE TABLE IF NOT EXISTS routes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id     VARCHAR(20) NOT NULL UNIQUE,
    vessel_type  VARCHAR(50) NOT NULL,
    fuel_type    VARCHAR(50) NOT NULL,
    year         INTEGER NOT NULL,
    ghg_intensity     NUMERIC(10,4) NOT NULL,
    fuel_consumption  NUMERIC(12,4) NOT NULL,
    distance          NUMERIC(12,4) NOT NULL,
    total_emissions   NUMERIC(12,4) NOT NULL,
    is_baseline  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS ship_compliance (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ship_id     VARCHAR(50) NOT NULL,
    year        INTEGER NOT NULL,
    cb_gco2eq   NUMERIC(20,4) NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ship_id, year)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS bank_entries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ship_id           VARCHAR(50) NOT NULL,
    year              INTEGER NOT NULL,
    amount_gco2eq     NUMERIC(20,4) NOT NULL,
    remaining_gco2eq  NUMERIC(20,4) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS pools (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year       INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS pool_members (
    pool_id   UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    ship_id   VARCHAR(50) NOT NULL,
    cb_before NUMERIC(20,4) NOT NULL,
    cb_after  NUMERIC(20,4) NOT NULL,
    PRIMARY KEY (pool_id, ship_id)
  );
  `,
];

async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const sql of migrations) {
      await client.query(sql);
    }
    await client.query('COMMIT');
    console.log('✅ Migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
