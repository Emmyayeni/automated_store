const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runQuery(query) {
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    const result = await client.query(query);
    
    if (result.rows.length > 0) {
      console.table(result.rows);
      console.log(`\n📊 Returned ${result.rows.length} rows`);
    } else {
      console.log('✅ Query executed successfully (no results)');
    }
    
  } catch (error) {
    console.error('❌ Query error:', error.message);
  } finally {
    await client.end();
    console.log('🔚 Connection closed');
  }
}

// Get query from command line argument
const query = process.argv[2];

if (!query) {
  console.log(`
🔍 Database Query Tool

Usage: node scripts/db-query.js "YOUR SQL QUERY"

Examples:
  node scripts/db-query.js "SELECT * FROM products LIMIT 5"
  node scripts/db-query.js "SELECT COUNT(*) FROM customers"
  node scripts/db-query.js "SELECT name, price FROM products WHERE price > 10"

Available Tables:
  • products, categories, customers, users
  • transactions, transaction_items
  • inventory, suppliers, locations
  • businesses, expenses, notifications
  • customer_segments, product_bundles
  • and many more...
  `);
  process.exit(1);
}

runQuery(query);
