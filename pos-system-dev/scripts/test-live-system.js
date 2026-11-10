const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('--- Verifying Database Records ---');
  const userRes = await pool.query('SELECT id, name, email, role, business_id FROM users ORDER BY email');
  console.log('Seeded Users:');
  console.table(userRes.rows);

  const locRes = await pool.query('SELECT id, name, address, business_id FROM locations ORDER BY name');
  console.log('Seeded Branches:');
  console.table(locRes.rows);

  const invCount = await pool.query('SELECT count(*) FROM inventory');
  console.log('Total inventory balance rows:', invCount.rows[0].count);

  const movCount = await pool.query('SELECT count(*) FROM stock_movements');
  console.log('Total stock movements recorded:', movCount.rows[0].count);

  const trCount = await pool.query('SELECT count(*) FROM inventory_transfers');
  console.log('Total transfers:', trCount.rows[0].count);

  await pool.end();
  console.log('All database checks passed!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
