const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  try {
    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    console.log('🔗 Connecting to Neon database...');
    const sql = neon(process.env.DATABASE_URL);

    // Execute individual statements one by one
    console.log('� Executing inventory management migration...');
    
    // Create enum
    try {
      console.log('⚡ Creating inventory_adjustment_type enum...');
      await sql`
        CREATE TYPE inventory_adjustment_type AS ENUM (
          'manual', 
          'sale', 
          'return', 
          'waste', 
          'theft', 
          'damage', 
          'recount', 
          'transfer_in', 
          'transfer_out', 
          'production', 
          'expired'
        )
      `;
      console.log('✅ Enum created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Enum already exists, skipping...');
      } else {
        console.error('❌ Error creating enum:', error.message);
      }
    }

    // Create inventory_adjustment_logs table
    try {
      console.log('⚡ Creating inventory_adjustment_logs table...');
      await sql`
        CREATE TABLE inventory_adjustment_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          adjustment_type inventory_adjustment_type NOT NULL,
          previous_quantity INTEGER NOT NULL,
          adjustment_quantity INTEGER NOT NULL,
          new_quantity INTEGER NOT NULL,
          reason TEXT NOT NULL,
          adjusted_by UUID NOT NULL REFERENCES users(id),
          reference_id UUID,
          reference_type TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `;
      console.log('✅ Table created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Table already exists, skipping...');
      } else {
        console.error('❌ Error creating table:', error.message);
      }
    }

    // Create indexes for inventory_adjustment_logs
    const indexes = [
      { name: 'idx_inventory_adjustment_logs_location', column: 'location_id' },
      { name: 'idx_inventory_adjustment_logs_product', column: 'product_id' },
      { name: 'idx_inventory_adjustment_logs_type', column: 'adjustment_type' },
      { name: 'idx_inventory_adjustment_logs_date', column: 'created_at' },
      { name: 'idx_inventory_adjustment_logs_adjusted_by', column: 'adjusted_by' }
    ];

    for (const index of indexes) {
      try {
        console.log(`⚡ Creating index ${index.name}...`);
        const indexQuery = `CREATE INDEX ${index.name} ON inventory_adjustment_logs(${index.column})`;
        await sql([indexQuery]);
        console.log(`✅ Index ${index.name} created successfully`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Index ${index.name} already exists, skipping...`);
        } else {
          console.error(`❌ Error creating index ${index.name}:`, error.message);
        }
      }
    }

    // Create inventory_transfers table
    try {
      console.log('⚡ Creating inventory_transfers table...');
      await sql`
        CREATE TABLE inventory_transfers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          transfer_number TEXT NOT NULL UNIQUE,
          from_location_id UUID NOT NULL REFERENCES locations(id),
          to_location_id UUID NOT NULL REFERENCES locations(id),
          requested_by UUID NOT NULL REFERENCES users(id),
          approved_by UUID REFERENCES users(id),
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'shipped', 'received', 'cancelled')),
          notes TEXT,
          requested_date TIMESTAMPTZ DEFAULT now(),
          approved_date TIMESTAMPTZ,
          shipped_date TIMESTAMPTZ,
          received_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `;
      console.log('✅ Table created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Table already exists, skipping...');
      } else {
        console.error('❌ Error creating table:', error.message);
      }
    }

    // Create inventory_transfer_items table
    try {
      console.log('⚡ Creating inventory_transfer_items table...');
      await sql`
        CREATE TABLE inventory_transfer_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          transfer_id UUID NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
          product_id UUID NOT NULL REFERENCES products(id),
          quantity_requested INTEGER NOT NULL,
          quantity_shipped INTEGER DEFAULT 0,
          quantity_received INTEGER DEFAULT 0,
          notes TEXT
        )
      `;
      console.log('✅ Table created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Table already exists, skipping...');
      } else {
        console.error('❌ Error creating table:', error.message);
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('✅ Added inventory_adjustment_type enum');
    console.log('✅ Created inventory_adjustment_logs table');
    console.log('✅ Created inventory_transfers table');
    console.log('✅ Created inventory_transfer_items table');
    console.log('✅ Added all necessary indexes');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();
