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
 * Inspect database structure and data using Neon's tagged template syntax
 */
async function inspectDatabase() {
  console.log('🔍 HARDYPOS Database Inspector (Fixed)');
  console.log('====================================\n');
  
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
      console.log('\n💡 This means either:');
      console.log('   1. The database hasn\'t been migrated yet');
      console.log('   2. You\'re connected to the wrong database');
      console.log('   3. The tables are in a different schema');
      console.log('\n🔧 To fix this:');
      console.log('   1. Run your database migrations');
      console.log('   2. Check your DATABASE_URL');
      console.log('   3. Verify your database setup');
      return;
    }
    
    console.log(`📋 Found ${tables.length} tables:\n`);
    
    // Get row counts for each table
    const tableCounts = [];
    let totalRows = 0;
    
    for (const { table_name } of tables) {
      try {
        // Use tagged template with safe table name interpolation
        const countResult = await sql`
          SELECT COUNT(*) as count 
          FROM ${sql.ident(table_name)}
        `;
        const count = parseInt(countResult[0].count);
        tableCounts.push({ table_name, count });
        totalRows += count;
      } catch (error) {
        console.warn(`⚠️  Warning: Could not count ${table_name}: ${error.message}`);
        tableCounts.push({ table_name, count: '?' });
      }
    }
    
    // Sort by row count (highest first)
    tableCounts.sort((a, b) => {
      if (typeof a.count === 'number' && typeof b.count === 'number') {
        return b.count - a.count;
      }
      return 0;
    });
    
    // Display results in a nice table
    console.table(
      tableCounts.map(({ table_name, count }) => ({
        'Table Name': `${count === 0 || count === '?' ? '📭' : '📦'} ${table_name}`,
        'Rows': count === '?' ? '?' : count.toLocaleString()
      })),
      ['Table Name', 'Rows']
    );
    
    console.log(`\n📊 Database Summary:`);
    console.log(`   📦 Tables with data: ${tableCounts.filter(t => typeof t.count === 'number' && t.count > 0).length}`);
    console.log(`   📭 Empty tables: ${tableCounts.filter(t => t.count === 0).length}`);
    console.log(`   🗃️  Total rows: ${totalRows.toLocaleString()}`);
    
    if (totalRows === 0) {
      console.log('\n✅ Database is completely empty - no data to clear!');
      console.log('\n💡 This is normal if:');
      console.log('   - This is a fresh installation');
      console.log('   - You haven\'t created any data yet');
      console.log('   - Data was already cleared');
    } else {
      console.log('\n📝 Data found! Here are some insights:');
      
      // Show tables with most data
      const datafulTables = tableCounts.filter(t => typeof t.count === 'number' && t.count > 0);
      if (datafulTables.length > 0) {
        console.log('\n🔝 Tables with most data:');
        datafulTables.slice(0, 5).forEach(({ table_name, count }) => {
          console.log(`   • ${table_name}: ${count.toLocaleString()} rows`);
        });
      }
      
      // Show core business tables
      const coreTablesCounts = {};
      ['users', 'businesses', 'products', 'transactions', 'customers', 'inventory'].forEach(table => {
        const found = tableCounts.find(t => t.table_name === table);
        if (found) coreTablesCounts[table] = found.count;
      });
      
      if (Object.keys(coreTablesCounts).length > 0) {
        console.log('\n🏢 Core business data:');
        Object.entries(coreTablesCounts).forEach(([table, count]) => {
          console.log(`   • ${table}: ${typeof count === 'number' ? count.toLocaleString() : count} records`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error analyzing database:', error.message);
    console.error(error.stack);
  }
}

// Run the inspector
inspectDatabase().catch(console.error);