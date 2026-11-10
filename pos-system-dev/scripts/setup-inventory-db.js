#!/usr/bin/env node
/**
 * Database Migration and Seeder for Automated Inventory Control System
 * Creates all schema tables, enums, indexes, and initial demo data.
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected.');

    console.log('📦 Creating extensions, enums, and tables...');

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- 1. Businesses
      CREATE TABLE IF NOT EXISTS businesses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        logo_url TEXT,
        industry TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        tax_rate NUMERIC(5, 4),
        currency TEXT DEFAULT 'USD',
        timezone TEXT DEFAULT 'America/New_York',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 2. Locations (Branches)
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        branch_code TEXT UNIQUE,
        address TEXT,
        phone TEXT,
        email TEXT,
        timezone TEXT DEFAULT 'America/New_York',
        currency TEXT DEFAULT 'USD',
        tax_rate NUMERIC(5, 4) DEFAULT 0.08,
        status TEXT DEFAULT 'active',
        manager_id UUID,
        open_hours TEXT,
        revenue INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 3. Users
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        password_hash TEXT,
        role TEXT NOT NULL,
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 4. Categories
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 5. Suppliers
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 6. Products
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        price NUMERIC(10, 2) NOT NULL,
        category TEXT,
        barcode TEXT,
        sku TEXT UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        cost_price NUMERIC(10, 2),
        stock_level INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        location TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 7. Inventory Enums
      DO $$ BEGIN
        CREATE TYPE stock_movement_type AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE stock_status_enum AS ENUM ('NORMAL', 'LOW_STOCK', 'OUT_OF_STOCK');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE transfer_status_enum AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE stock_out_reason AS ENUM ('SALE', 'DAMAGED', 'EXPIRED', 'INTERNAL_USE', 'ADJUSTMENT', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE inventory_audit_action AS ENUM (
          'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 
          'TRANSFER_REQUESTED', 'TRANSFER_APPROVED', 'TRANSFER_REJECTED', 
          'TRANSFER_DISPATCHED', 'TRANSFER_RECEIVED', 
          'PRODUCT_CREATED', 'PRODUCT_UPDATED', 
          'BRANCH_CREATED', 'USER_CREATED', 'USER_DEACTIVATED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- 8. Inventory (Branch Stock Level)
      CREATE TABLE IF NOT EXISTS inventory (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        stock_status stock_status_enum DEFAULT 'NORMAL',
        min_stock_level INTEGER DEFAULT 10,
        max_stock_level INTEGER DEFAULT 100,
        cost_price NUMERIC(10, 2),
        sell_price NUMERIC(10, 2),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_inventory_location_product UNIQUE(location_id, product_id)
      );

      -- 9. Inventory Transfers
      CREATE TABLE IF NOT EXISTS inventory_transfers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        transfer_number TEXT NOT NULL UNIQUE,
        from_location_id UUID NOT NULL REFERENCES locations(id),
        to_location_id UUID NOT NULL REFERENCES locations(id),
        requested_by UUID NOT NULL REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        dispatched_by UUID REFERENCES users(id),
        received_by UUID REFERENCES users(id),
        status transfer_status_enum DEFAULT 'REQUESTED',
        notes TEXT,
        rejection_reason TEXT,
        requested_date TIMESTAMPTZ DEFAULT NOW(),
        approved_date TIMESTAMPTZ,
        dispatched_date TIMESTAMPTZ,
        received_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 10. Inventory Transfer Items
      CREATE TABLE IF NOT EXISTS inventory_transfer_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        transfer_id UUID NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        quantity_requested INTEGER NOT NULL,
        quantity_dispatched INTEGER DEFAULT 0,
        quantity_received INTEGER DEFAULT 0,
        discrepancy_qty INTEGER DEFAULT 0,
        discrepancy_reason TEXT,
        notes TEXT
      );

      -- 11. Stock Movements (Immutable Ledger)
      CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        location_id UUID NOT NULL REFERENCES locations(id),
        product_id UUID NOT NULL REFERENCES products(id),
        user_id UUID NOT NULL REFERENCES users(id),
        movement_type stock_movement_type NOT NULL,
        quantity INTEGER NOT NULL,
        balance_before INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        reason stock_out_reason,
        reference TEXT,
        notes TEXT,
        transfer_id UUID REFERENCES inventory_transfers(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 12. Inventory Audit Logs
      CREATE TABLE IF NOT EXISTS inventory_audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        location_id UUID REFERENCES locations(id),
        action inventory_audit_action NOT NULL,
        entity_type VARCHAR(100),
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create performance indexes
      CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(stock_status);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_location ON stock_movements(location_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_transfers_from ON inventory_transfers(from_location_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_to ON inventory_transfers(to_location_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_status ON inventory_transfers(status);
    `);

    console.log('✅ Tables and schema created successfully.');

    // Check if initial business already exists
    const checkBiz = await client.query('SELECT id FROM businesses LIMIT 1');
    if (checkBiz.rows.length > 0) {
      console.log('ℹ️ Database already has data. Skipping demo seed.');
      return;
    }

    console.log('🌱 Seeding initial demo data...');

    // 1. Business
    const businessId = randomUUID();
    await client.query(`
      INSERT INTO businesses (id, name, industry, email, phone, address, currency)
      VALUES ($1, 'Apex Multi-Branch Supermarket', 'Retail & Supermarket', 'support@apexsupermarket.com', '+1-800-555-0199', '100 Enterprise Way, Suite 400', 'USD')
    `, [businessId]);

    // 2. Branches
    const branch1Id = randomUUID();
    const branch2Id = randomUUID();
    const branch3Id = randomUUID();

    await client.query(`
      INSERT INTO locations (id, business_id, name, branch_code, address, phone, email, status)
      VALUES 
        ($1, $4, 'Downtown Central Hub', 'BRN-001', '124 Main Street, Downtown', '555-0101', 'downtown@apexsupermarket.com', 'active'),
        ($2, $4, 'Westside Mall Branch', 'BRN-002', '450 Westside Mall Blvd', '555-0102', 'westside@apexsupermarket.com', 'active'),
        ($3, $4, 'Airport Plaza Branch', 'BRN-003', '88 Terminal Drive', '555-0103', 'airport@apexsupermarket.com', 'active')
    `, [branch1Id, branch2Id, branch3Id, businessId]);

    // 3. Users (Password: "password123")
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminId = randomUUID();
    const managerId = randomUUID();
    const clerkId = randomUUID();
    const cashierId = randomUUID();

    await client.query(`
      INSERT INTO users (id, business_id, location_id, name, email, password_hash, role, is_active)
      VALUES
        ($1, $5, NULL, 'Alexander Wright (Admin)', 'admin@retail.com', $6, 'ADMIN', true),
        ($2, $5, $7, 'Maria Sanchez (Manager)', 'manager@retail.com', $6, 'BRANCH_MANAGER', true),
        ($3, $5, $7, 'Kevin Vance (Clerk)', 'clerk@retail.com', $6, 'CLERK', true),
        ($4, $5, $7, 'Chloe Bennett (Cashier)', 'cashier@retail.com', $6, 'CASHIER', true)
    `, [adminId, managerId, clerkId, cashierId, businessId, passwordHash, branch1Id]);

    // 4. Products
    const p1 = randomUUID();
    const p2 = randomUUID();
    const p3 = randomUUID();
    const p4 = randomUUID();
    const p5 = randomUUID();
    const p6 = randomUUID();
    const p7 = randomUUID();
    const p8 = randomUUID();

    await client.query(`
      INSERT INTO products (id, business_id, name, sku, category, price, cost_price, reorder_level, is_active)
      VALUES
        ($1, $9, 'Farm Fresh Whole Milk 1L', 'SKU-DRY-001', 'Dairy & Eggs', 2800.00, 2100.00, 15, true),
        ($2, $9, 'Artisan Sourdough Loaf', 'SKU-BKY-002', 'Bakery', 3200.00, 2200.00, 10, true),
        ($3, $9, 'Organic Gala Apples (1kg Bag)', 'SKU-PRD-003', 'Produce', 5500.00, 4100.00, 12, true),
        ($4, $9, 'Premium Arabica Coffee Beans 500g', 'SKU-BVG-004', 'Beverages', 13500.00, 9800.00, 8, true),
        ($5, $9, 'Extra Virgin Olive Oil 750ml', 'SKU-PAN-005', 'Pantry', 18500.00, 13800.00, 10, true),
        ($6, $9, 'Whole Grain Brown Rice 2kg', 'SKU-PAN-006', 'Pantry', 7500.00, 5400.00, 15, true),
        ($7, $9, 'Sparkling Mineral Water 6-Pack', 'SKU-BVG-007', 'Beverages', 3600.00, 2500.00, 10, true),
        ($8, $9, 'Sea Salt Potato Crisps 150g', 'SKU-SNK-008', 'Snacks', 2000.00, 1350.00, 20, true)
    `, [p1, p2, p3, p4, p5, p6, p7, p8, businessId]);

    // 5. Initial Inventory Stock
    // Downtown Central (Branch 1)
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
    `, [branch1Id, p1, p2, p3, p4, p5, p6, p7, p8]);

    // Westside Mall (Branch 2)
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
    `, [branch2Id, p1, p2, p3, p4, p5, p6, p7, p8]);

    // Airport Plaza (Branch 3)
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
    `, [branch3Id, p1, p2, p3, p4, p5, p6, p7, p8]);

    // 6. Initial Stock Movement Records (for history & reports)
    await client.query(`
      INSERT INTO stock_movements (location_id, product_id, user_id, movement_type, quantity, balance_before, balance_after, reference, notes)
      VALUES
        ($1, $3, $2, 'STOCK_IN', 60, 0, 60, 'PO-2026-001', 'Initial stock delivery from Central Supplier'),
        ($1, $4, $2, 'STOCK_IN', 25, 0, 25, 'PO-2026-001', 'Initial stock delivery'),
        ($1, $5, $2, 'STOCK_IN', 20, 0, 20, 'PO-2026-002', 'Delivered from Fresh Farm'),
        ($1, $5, $2, 'STOCK_OUT', 12, 20, 8, 'ORD-9821', 'Sold during morning shift'),
        ($1, $6, $2, 'STOCK_IN', 50, 0, 50, 'PO-2026-003', 'Roastery direct shipment'),
        ($1, $6, $2, 'STOCK_OUT', 5, 50, 45, 'ORD-9825', 'Store counter consumption')
    `, [branch1Id, adminId, p1, p2, p3, p4]);

    // 7. Initial Sample Transfer Request
    const transferId = randomUUID();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const transferNumber = `TR-${dateStr}-0001`;

    await client.query(`
      INSERT INTO inventory_transfers (id, transfer_number, from_location_id, to_location_id, requested_by, status, notes)
      VALUES ($1, $2, $3, $4, $5, 'REQUESTED', 'Restock urgent shortage of Whole Milk and Coffee Beans')
    `, [transferId, transferNumber, branch1Id, branch2Id, clerkId]);

    await client.query(`
      INSERT INTO inventory_transfer_items (transfer_id, product_id, quantity_requested)
      VALUES
        ($1, $2, 15),
        ($1, $3, 10)
    `, [transferId, p1, p4]);

    console.log('✅ Demo seed completed successfully!');
    console.log('\n=============================================');
    console.log('🎉 AUTOMATED INVENTORY CONTROL SYSTEM READY');
    console.log('=============================================');
    console.log('Branches created:');
    console.log('  1. Downtown Central Hub (BRN-001)');
    console.log('  2. Westside Mall Branch (BRN-002)');
    console.log('  3. Airport Plaza Branch (BRN-003)');
    console.log('\nLogin Accounts (Password for all: password123):');
    console.log('  • Admin:          admin@retail.com   (Full cross-branch visibility & management)');
    console.log('  • Branch Manager: manager@retail.com (Downtown Branch: approvals, inventory, reports)');
    console.log('  • Clerk:          clerk@retail.com   (Downtown Branch: stock-in, stock-out, transfer requests)');
    console.log('  • Cashier:        cashier@retail.com (Downtown Branch: sales & stock deduction)');
    console.log('=============================================\n');

  } catch (err) {
    console.error('❌ Error executing database setup:', err);
    throw err;
  } finally {
    await client.end();
  }
}

setupDatabase().catch(() => process.exit(1));
