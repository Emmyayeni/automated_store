#!/usr/bin/env node

/**
 * Database Inspector Script
 * 
 * This script inspects your database to see what tables exist
 * and how much data is in each table.
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

/**
 * Inspect database structure and data
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
        // Build the query string manually - safer for dynamic table names
        const query = `SELECT COUNT(*) as count FROM "${table_name}"`;
        const countResult = await sql(query);
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
    
    // Display results
    console.log('┌─────────────────────────────────┬──────────┐');
    console.log('│ Table Name                      │ Rows     │');
    console.log('├─────────────────────────────────┼──────────┤');
    
    tableCounts.forEach(({ table_name, count }) => {
      const tableName = table_name.padEnd(31);
      const rowCount = count.toString().padStart(8);
      const indicator = count > 0 ? '📦' : '📭';
      console.log(`│ ${indicator} ${tableName.slice(2)} │ ${rowCount} │`);
    });
    
    console.log('├─────────────────────────────────┼──────────┤');
    console.log(`│ ${'TOTAL'.padEnd(31)} │ ${totalRows.toString().padStart(8)} │`);
    console.log('└─────────────────────────────────┴──────────┘');
    
    // Analysis
    const nonEmptyTables = tableCounts.filter(t => t.count > 0);
    const emptyTables = tableCounts.filter(t => t.count === 0);
    
    console.log(`\n📊 Database Summary:`);
    console.log(`   📦 Tables with data: ${nonEmptyTables.length}`);
    console.log(`   📭 Empty tables: ${emptyTables.length}`);
    console.log(`   🗃️  Total rows: ${totalRows.toLocaleString()}`);
    
    if (totalRows === 0) {
      console.log('\n✅ Database is completely empty - no data to clear!');
      console.log('\n💡 This is normal if:');
      console.log('   - This is a fresh installation');
      console.log('   - You haven\'t created any data yet');
      console.log('   - Data was already cleared');
    } else {
      console.log('\n🎯 Tables with most data:');
      nonEmptyTables.slice(0, 5).forEach(({ table_name, count }) => {
        console.log(`   📦 ${table_name}: ${count.toLocaleString()} rows`);
      });
    }
    
    // Show sample table structure for the largest table
    if (nonEmptyTables.length > 0) {
      const largestTable = nonEmptyTables[0].table_name;
      console.log(`\n🔍 Sample structure of '${largestTable}' table:`);
      
      try {
        const columns = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = ${largestTable} AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
        
        console.log('┌─────────────────────────────────┬─────────────┬──────────┐');
        console.log('│ Column Name                     │ Data Type   │ Nullable │');
        console.log('├─────────────────────────────────┼─────────────┼──────────┤');
        
        columns.slice(0, 10).forEach(({ column_name, data_type, is_nullable }) => {
          const colName = column_name.padEnd(31);
          const dataType = data_type.padEnd(11);
          const nullable = is_nullable.padEnd(8);
          console.log(`│ ${colName} │ ${dataType} │ ${nullable} │`);
        });
        
        if (columns.length > 10) {
          console.log('│ ...                             │ ...         │ ...      │');
        }
        
        console.log('└─────────────────────────────────┴─────────────┴──────────┘');
      } catch (error) {
        console.warn(`⚠️  Could not inspect table structure: ${error.message}`);
      }
    }
    
    // Check for common HARDYPOS tables
    const expectedTables = [
      'businesses', 'users', 'locations', 'products', 'inventory', 
      'transactions', 'customers', 'categories'
    ];
    
    const missingTables = expectedTables.filter(table => 
      !tables.some(t => t.table_name === table)
    );
    
    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing expected HARDYPOS tables:`);
      missingTables.forEach(table => {
        console.log(`   ❌ ${table}`);
      });
      console.log('\n💡 This might mean:');
      console.log('   - Database migrations haven\'t been run');
      console.log('   - Tables have different names');
      console.log('   - You\'re using a different database');
    }
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error.message);
    console.error('Full error:', error);
  }
}

// Run the inspector
inspectDatabase().catch(console.error);