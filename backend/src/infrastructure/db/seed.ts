import pool from './pool';

const routes = [
  {
    route_id: 'R001',
    vessel_type: 'Container',
    fuel_type: 'HFO',
    year: 2024,
    ghg_intensity: 91.0,
    fuel_consumption: 5000,
    distance: 12000,
    total_emissions: 4500,
    is_baseline: true,  // R001 is the default baseline
  },
  {
    route_id: 'R002',
    vessel_type: 'BulkCarrier',
    fuel_type: 'LNG',
    year: 2024,
    ghg_intensity: 88.0,
    fuel_consumption: 4800,
    distance: 11500,
    total_emissions: 4200,
    is_baseline: false,
  },
  {
    route_id: 'R003',
    vessel_type: 'Tanker',
    fuel_type: 'MGO',
    year: 2024,
    ghg_intensity: 93.5,
    fuel_consumption: 5100,
    distance: 12500,
    total_emissions: 4700,
    is_baseline: false,
  },
  {
    route_id: 'R004',
    vessel_type: 'RoRo',
    fuel_type: 'HFO',
    year: 2025,
    ghg_intensity: 89.2,
    fuel_consumption: 4900,
    distance: 11800,
    total_emissions: 4300,
    is_baseline: false,
  },
  {
    route_id: 'R005',
    vessel_type: 'Container',
    fuel_type: 'LNG',
    year: 2025,
    ghg_intensity: 90.5,
    fuel_consumption: 4950,
    distance: 11900,
    total_emissions: 4400,
    is_baseline: false,
  },
];

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing seed data
    await client.query('DELETE FROM pool_members');
    await client.query('DELETE FROM pools');
    await client.query('DELETE FROM bank_entries');
    await client.query('DELETE FROM ship_compliance');
    await client.query('DELETE FROM routes');

    for (const r of routes) {
      await client.query(
        `INSERT INTO routes (route_id, vessel_type, fuel_type, year, ghg_intensity, fuel_consumption, distance, total_emissions, is_baseline)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (route_id) DO UPDATE SET
           vessel_type = EXCLUDED.vessel_type,
           fuel_type = EXCLUDED.fuel_type,
           year = EXCLUDED.year,
           ghg_intensity = EXCLUDED.ghg_intensity,
           fuel_consumption = EXCLUDED.fuel_consumption,
           distance = EXCLUDED.distance,
           total_emissions = EXCLUDED.total_emissions,
           is_baseline = EXCLUDED.is_baseline`,
        [r.route_id, r.vessel_type, r.fuel_type, r.year, r.ghg_intensity, r.fuel_consumption, r.distance, r.total_emissions, r.is_baseline]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
