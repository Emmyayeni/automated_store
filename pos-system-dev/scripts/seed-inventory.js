#!/usr/bin/env node
const { Client } = require('pg');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: '.env.local' });

async function seedInventory() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔗 Connected to DB.');

    const locs = (await client.query('SELECT id, branch_code, name FROM locations ORDER BY branch_code')).rows;
    const prods = (await client.query('SELECT id, name, sku FROM products ORDER BY sku')).rows;
    const users = (await client.query('SELECT id, email, role FROM users')).rows;

    const admin = users.find(u => u.role === 'ADMIN');
    const clerk = users.find(u => u.role === 'CLERK');

    console.log(`Found ${locs.length} locations, ${prods.length} products, ${users.length} users.`);

    // Clear any existing inventory/movements/transfers to start fresh
    await client.query('DELETE FROM inventory_transfer_items');
    await client.query('DELETE FROM stock_movements');
    await client.query('DELETE FROM inventory_transfers');
    await client.query('DELETE FROM inventory');

    // 1. Seed Inventory for each location
    const [b1, b2, b3] = locs;
    const [p1, p2, p3, p4, p5, p6, p7, p8] = prods;

    // Branch 1 (Downtown)
    await client.query(`
      INSERT INTO inventory (location_id, product_id, quantity, reorder_level, stock_status)
      VALUES
        ($1, $2, 60, 15, 'NORMAL'),
        ($1, $3, 25, 10, 'NORMAL'),
        ($1, $4, 8, 12, 'LOW_STOCK'),
        ($1, $5, 45, 8, 'NORMAL'),
        ($1, $6, 30, 10, 'NORMAL'),
        ($1, $7, 0, 15, 'OUT_OF_STOCK'),
        ($1, $8, 50, 10, 'NORMAL'),
        ($1, $9, 75, 20, 'NORMAL')
    `, [b1.id, p1.id, p2.id, p3.id, p4.id, p5.id, p6.id, p7.id, p8.id]);

    // Branch 2 (Westside)
    await client.query(`
      INSERT INTO inventory (location_id, product_id, quantity, reorder_level, stock_status)
      VALUES
        ($1, $2, 40, 15, 'NORMAL'),
        ($1, $3, 5, 10, 'LOW_STOCK'),
        ($1, $4, 20, 12, 'NORMAL'),
        ($1, $5, 18, 8, 'NORMAL'),
        ($1, $6, 2, 10, 'LOW_STOCK'),
        ($1, $7, 35, 15, 'NORMAL'),
        ($1, $8, 0, 10, 'OUT_OF_STOCK'),
        ($1, $9, 40, 20, 'NORMAL')
    `, [b2.id, p1.id, p2.id, p3.id, p4.id, p5.id, p6.id, p7.id, p8.id]);

    // Branch 3 (Airport)
    await client.query(`
      INSERT INTO inventory (location_id, product_id, quantity, reorder_level, stock_status)
      VALUES
        ($1, $2, 15, 15, 'LOW_STOCK'),
        ($1, $3, 12, 10, 'NORMAL'),
        ($1, $4, 0, 12, 'OUT_OF_STOCK'),
        ($1, $5, 22, 8, 'NORMAL'),
        ($1, $6, 14, 10, 'NORMAL'),
        ($1, $7, 18, 15, 'NORMAL'),
        ($1, $8, 28, 10, 'NORMAL'),
        ($1, $9, 60, 20, 'NORMAL')
    `, [b3.id, p1.id, p2.id, p3.id, p4.id, p5.id, p6.id, p7.id, p8.id]);

    console.log('✅ Seeded 24 inventory balances across 3 branches.');

    // 2. Seed initial stock movements
    await client.query(`
      INSERT INTO stock_movements (location_id, product_id, user_id, movement_type, quantity, balance_before, balance_after, reference, notes)
      VALUES
        ($1, $3, $2, 'STOCK_IN', 60, 0, 60, 'PO-2026-001', 'Initial stock delivery from Central Supplier'),
        ($1, $4, $2, 'STOCK_IN', 25, 0, 25, 'PO-2026-001', 'Initial stock delivery'),
        ($1, $5, $2, 'STOCK_IN', 20, 0, 20, 'PO-2026-002', 'Delivered from Fresh Farm'),
        ($1, $5, $2, 'STOCK_OUT', 12, 20, 8, 'ORD-9821', 'Sold during morning shift'),
        ($1, $6, $2, 'STOCK_IN', 50, 0, 50, 'PO-2026-003', 'Roastery direct shipment'),
        ($1, $6, $2, 'STOCK_OUT', 5, 50, 45, 'ORD-9825', 'Store counter consumption')
    `, [b1.id, admin.id, p1.id, p2.id, p3.id, p4.id]);

    console.log('✅ Seeded stock movements.');

    // 3. Seed an initial sample transfer
    const transferId = randomUUID();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const transferNumber = `TR-${dateStr}-0001`;

    await client.query(`
      INSERT INTO inventory_transfers (id, transfer_number, from_location_id, to_location_id, requested_by, status, notes)
      VALUES ($1, $2, $3, $4, $5, 'REQUESTED', 'Restock urgent shortage of Whole Milk and Coffee Beans')
    `, [transferId, transferNumber, b1.id, b2.id, clerk.id]);

    await client.query(`
      INSERT INTO inventory_transfer_items (transfer_id, product_id, quantity_requested)
      VALUES
        ($1, $2, 15),
        ($1, $3, 10)
    `, [transferId, p1.id, p4.id]);

    console.log(`✅ Seeded sample transfer request: ${transferNumber}`);
    console.log('\nAll inventory records, movements, and transfers seeded successfully!');

  } catch (err) {
    console.error('Error seeding inventory:', err);
  } finally {
    await client.end();
  }
}

seedInventory();
