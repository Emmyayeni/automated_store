const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const NIGERIAN_PRODUCT_PRICES = [
  { sku: 'SKU-DRY-001', name: 'Farm Fresh Whole Milk 1L', price: 2800.00, cost: 2100.00 },
  { sku: 'SKU-BKY-002', name: 'Artisan Sourdough Loaf', price: 3200.00, cost: 2200.00 },
  { sku: 'SKU-PRD-003', name: 'Organic Gala Apples (1kg Bag)', price: 5500.00, cost: 4100.00 },
  { sku: 'SKU-BVG-004', name: 'Premium Arabica Coffee Beans 500g', price: 13500.00, cost: 9800.00 },
  { sku: 'SKU-PAN-005', name: 'Extra Virgin Olive Oil 750ml', price: 18500.00, cost: 13800.00 },
  { sku: 'SKU-PAN-006', name: 'Whole Grain Brown Rice 2kg', price: 7500.00, cost: 5400.00 },
  { sku: 'SKU-BVG-007', name: 'Sparkling Mineral Water 6-Pack', price: 3600.00, cost: 2500.00 },
  { sku: 'SKU-SNK-008', name: 'Sea Salt Potato Crisps 150g', price: 2000.00, cost: 1350.00 },
];

async function main() {
  console.log('🇳🇬 Migrating database to Nigerian Naira (NGN)...');

  // 1. Update businesses and locations currency
  await pool.query("UPDATE businesses SET currency = 'NGN'");
  await pool.query("UPDATE locations SET currency = 'NGN'");
  console.log('✅ Updated businesses & locations currency to NGN.');

  // 2. Update predefined seed products
  for (const item of NIGERIAN_PRODUCT_PRICES) {
    const res = await pool.query(
      `UPDATE products 
       SET price = $1, cost_price = $2 
       WHERE sku = $3 OR name ILIKE $4`,
      [item.price, item.cost, item.sku, `%${item.name}%`]
    );
    console.log(`Updated "${item.name}": ₦${item.price.toLocaleString()} (${res.rowCount} row(s))`);
  }

  // 3. For any other products with low prices (< 100), scale to realistic Naira
  await pool.query(`
    UPDATE products 
    SET price = ROUND(price * 800, -2), 
        cost_price = ROUND(COALESCE(cost_price, price * 0.7) * 800, -2)
    WHERE price < 100
  `);

  // 4. Update inventory cost prices to match product cost_price
  await pool.query(`
    UPDATE inventory i
    SET cost_price = p.cost_price
    FROM products p
    WHERE i.product_id = p.id AND (i.cost_price IS NULL OR i.cost_price < 100)
  `);

  // Verify updated products
  const verified = await pool.query('SELECT id, name, sku, price, cost_price FROM products ORDER BY name');
  console.log('\n--- Verified Products in Naira (₦) ---');
  console.table(verified.rows.map(r => ({
    name: r.name,
    sku: r.sku,
    selling_price: `₦${Number(r.price).toLocaleString()}`,
    cost_price: `₦${Number(r.cost_price || 0).toLocaleString()}`
  })));

  await pool.end();
  console.log('\n🇳🇬 Migration to Nigerian Naira complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
