import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local (Next.js default)
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not found!');
  console.log('💡 Make sure you have a .env.local file with DATABASE_URL set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

/**
 * Simple database inspector that counts rows in each table
 */
async function inspectDatabase() {
  console.log('🔍 HARDYPOS Database Inspector');
  console.log('=============================\n');
  
  try {
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connected successfully\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
  
  console.log('📊 Analyzing database structure...\n');
  
  try {
    // Get all tables in the public schema
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      console.log('❌ No tables found in the database!');
      return;
    }
    
    console.log(`📋 Found ${tables.length} tables:\n`);
    
    // Check a few key tables to see if they have data
    const keyTables = ['users', 'businesses', 'products', 'transactions', 'customers', 'inventory'];
    const results = [];
    let totalRows = 0;
    
    for (const tableName of keyTables) {
      try {
        // Check if table exists first
        const tableExists = tables.some(t => t.table_name === tableName);
        if (tableExists) {
          // Try to count rows in this table
          const countResult = await sql`SELECT COUNT(*) as count FROM ${sql.unsafe(tableName)}`;
          const count = parseInt(countResult[0].count || 0);
          results.push({ table: tableName, count });
          totalRows += count;
        } else {
          results.push({ table: tableName, count: 'N/A' });
        }
      } catch (error) {
        console.log(`⚠️  Could not count ${tableName}: ${error.message}`);
        results.push({ table: tableName, count: '?' });
      }
    }
    
    console.log('🔍 Key table analysis:');
    results.forEach(({ table, count }) => {
      const icon = count === 0 ? '📭' : count === '?' ? '❓' : '📦';
      console.log(`   ${icon} ${table}: ${count === '?' ? 'Error' : count} rows`);
    });
    
    console.log(`\n📊 Total rows in key tables: ${totalRows}`);
    
    if (totalRows === 0) {
      console.log('\n✅ Database appears to be empty - no data to clear!');
      console.log('\n💡 This is normal if:');
      console.log('   - This is a fresh installation');
      console.log('   - You haven\'t created any data yet');
      console.log('   - Data was already cleared');
    } else {
      console.log('\n📝 Database contains data that can be cleared with the cleanup scripts.');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing database:', error.message);
    
    // Try a simple test to see if we can query any table
    try {
      const testResult = await sql`SELECT 1 as test`;
      console.log('✅ Basic SQL queries work fine');
      
      // Let's try to count just the users table as a test
      const userCount = await sql`SELECT COUNT(*) as count FROM users`;
      console.log(`👤 Users table has ${userCount[0].count} records`);
      
    } catch (testError) {
      console.error('❌ Even basic queries are failing:', testError.message);
    }
  }
}

// Run the inspector
inspectDatabase().catch(console.error);