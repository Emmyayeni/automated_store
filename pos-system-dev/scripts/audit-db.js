const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const c = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await c.connect();
  const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log("DB Tables:", tables.rows.map(r => r.table_name));

  // Check rows count in main tables
  for (const t of ['businesses', 'locations', 'users', 'products', 'inventory', 'stock_movements', 'inventory_transfers', 'inventory_transfer_items', 'inventory_audit_logs', 'shifts', 'transactions']) {
    try {
      const res = await c.query(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`Table ${t}: ${res.rows[0].count} rows`);
    } catch (e) {
      console.log(`Table ${t}: DOES NOT EXIST or error (${e.message})`);
    }
  }

  await c.end();
}

run().catch(console.error);
