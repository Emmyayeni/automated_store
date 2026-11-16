const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
let dbUrl = '';
for (const line of env.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  }
}

const sql = neon(dbUrl);

async function run() {
  try {
    console.log('Ensuring transactions and transaction_items tables exist...');

    // 1. Create transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_number TEXT NOT NULL UNIQUE,
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        location_id UUID REFERENCES locations(id),
        cashier_id UUID REFERENCES users(id),
        customer_id UUID,
        subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        discount_amount NUMERIC(10, 2) DEFAULT 0.00,
        total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        item_count INTEGER DEFAULT 1,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        status TEXT DEFAULT 'completed',
        notes TEXT,
        paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    console.log('transactions table verified/created.');

    // 2. Create transaction_items table
    await sql`
      CREATE TABLE IF NOT EXISTS transaction_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        line_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        discount NUMERIC(10, 2) DEFAULT 0.00
      );
    `;
    console.log('transaction_items table verified/created.');

    // Check if any transactions exist
    const txCount = await sql`SELECT count(id) FROM transactions`;
    console.log('Current transaction count:', txCount[0].count);

    if (parseInt(txCount[0].count) === 0) {
      console.log('Seeding initial completed transactions from stock_movements or sample data...');
      
      // Get location, cashier, products
      const [business] = await sql`SELECT id FROM businesses LIMIT 1`;
      const [location] = await sql`SELECT id FROM locations LIMIT 1`;
      const [cashier] = await sql`SELECT id FROM users WHERE role = 'CASHIER' LIMIT 1`;
      const [adminUser] = await sql`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`;
      const products = await sql`SELECT id, name, price FROM products LIMIT 5`;

      const targetCashierId = cashier?.id || adminUser?.id;

      if (location && targetCashierId && products.length > 0) {
        // Create 3 realistic transactions for testing and verification
        const sampleSales = [
          {
            num: 'TXN-20261116-001',
            date: new Date(Date.now() - 3600000 * 4), // 4 hours ago
            items: [
              { product: products[0], qty: 2 },
              { product: products[1] || products[0], qty: 1 }
            ],
            method: 'cash'
          },
          {
            num: 'TXN-20261116-002',
            date: new Date(Date.now() - 3600000 * 2), // 2 hours ago
            items: [
              { product: products[2] || products[0], qty: 3 }
            ],
            method: 'card'
          },
          {
            num: 'TXN-20261116-003',
            date: new Date(Date.now() - 1800000), // 30 mins ago
            items: [
              { product: products[0], qty: 1 },
              { product: products[1] || products[0], qty: 2 }
            ],
            method: 'pos_transfer'
          }
        ];

        for (const sale of sampleSales) {
          let subtotal = 0;
          for (const item of sale.items) {
            const price = parseFloat(item.product.price) || 2500;
            subtotal += price * item.qty;
          }
          const tax = Math.round(subtotal * 0.075 * 100) / 100;
          const total = subtotal + tax;
          const totalQty = sale.items.reduce((acc, i) => acc + i.qty, 0);

          const [insertedTx] = await sql`
            INSERT INTO transactions (
              transaction_number,
              business_id,
              location_id,
              cashier_id,
              subtotal,
              tax_amount,
              total,
              item_count,
              payment_method,
              status,
              created_at,
              paid_at
            ) VALUES (
              ${sale.num},
              ${business?.id || null},
              ${location.id},
              ${targetCashierId},
              ${subtotal},
              ${tax},
              ${total},
              ${totalQty},
              ${sale.method},
              'completed',
              ${sale.date},
              ${sale.date}
            ) RETURNING id;
          `;

          for (const item of sale.items) {
            const price = parseFloat(item.product.price) || 2500;
            const lineTotal = price * item.qty;
            await sql`
              INSERT INTO transaction_items (
                transaction_id,
                product_id,
                quantity,
                unit_price,
                line_total
              ) VALUES (
                ${insertedTx.id},
                ${item.product.id},
                ${item.qty},
                ${price},
                ${lineTotal}
              );
            `;
          }
        }
        console.log('Seeded sample transactions successfully.');
      }
    }

    const checkFinal = await sql`SELECT id, transaction_number, total, cashier_id, created_at FROM transactions`;
    console.log('Final transactions in DB:', checkFinal);

  } catch (e) {
    console.error('Error setting up transactions table:', e);
  }
}

run();
