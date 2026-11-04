#!/usr/bin/env node
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function connectToDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Successfully connected to database!');
    
    // Show database info
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log('\n📊 Database Information:');
    console.log('Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
    console.log('Database:', result.rows[0].current_database);
    console.log('User:', result.rows[0].current_user);
    
    // Show tables
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('\n📋 Available Tables:');
    if (tables.rows.length > 0) {
      tables.rows.forEach(row => {
        console.log(`  • ${row.tablename}`);
      });
    } else {
      console.log('  No tables found. Run the schema scripts first.');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.end();
    console.log('\n🔚 Connection closed.');
  }
}

connectToDatabase();
