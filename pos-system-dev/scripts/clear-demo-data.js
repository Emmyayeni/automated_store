#!/usr/bin/env node

/**
 * HARDYPOS Demo Data Cleanup Script
 * 
 * This script deletes all demo data from the database.
 * Use with caution - this action is IRREVERSIBLE!
 * 
 * Usage:
 *   node scripts/clear-demo-data.js [options]
 * 
 * Options:
 *   --all              Delete all data from all tables
 *   --business-data    Delete business, products, inventory, transactions only
 *   --users-only       Delete users, staff, and auth data only
 *   --transactions     Delete transactions and related data only
 *   --pharmacy         Delete pharmacy-specific data only
 *   --confirm          Skip confirmation prompt (for automation)
 *   --dry-run          Show what would be deleted without actually deleting
 * 
 * Examples:
 *   node scripts/clear-demo-data.js --all --confirm
 *   node scripts/clear-demo-data.js --business-data --dry-run
 *   node scripts/clear-demo-data.js --users-only
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import readline from 'readline';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all'),
  businessData: args.includes('--business-data'),
  usersOnly: args.includes('--users-only'),
  transactions: args.includes('--transactions'),
  pharmacy: args.includes('--pharmacy'),
  confirm: args.includes('--confirm'),
  dryRun: args.includes('--dry-run')
};

// Define table groups for selective deletion
const TABLE_GROUPS = {
  // Core business tables
  BUSINESS: [
    'businesses',
    'locations',
    'location_settings'
  ],
  
  // User and authentication tables
  USERS: [
    'users',
    'staff_invites',
    'audit_logs',
    'shifts',
    'employee_schedules'
  ],
  
  // Product and inventory tables
  PRODUCTS: [
    'products',
    'categories',
    'suppliers',
    'inventory',
    'inventory_adjustment_logs',
    'inventory_transfers',
    'inventory_transfer_items',
    'product_variants',
    'product_reviews',
    'product_bundles',
    'bundle_items',
    'product_kits',
    'kit_components',
    'price_history',
    'stock_alerts',
    'reorder_suggestions'
  ],
  
  // Transaction tables
  TRANSACTIONS: [
    'transactions',
    'transaction_items',
    'transaction_payments',
    'held_transactions',
    'cash_sessions',
    'tips',
    'offline_transactions'
  ],
  
  // Customer tables
  CUSTOMERS: [
    'customers',
    'customer_feedback',
    'customer_appointments',
    'customer_segments',
    'customer_segment_members',
    'loyalty_transactions',
    'loyalty_rewards'
  ],
  
  // Pharmacy tables
  PHARMACY: [
    'patients',
    'doctors',
    'prescriptions',
    'prescription_items',
    'drug_interactions',
    'pharmacy_inventory'
  ],
  
  // Business operations tables
  OPERATIONS: [
    'expenses',
    'expense_categories',
    'equipment',
    'maintenance_records',
    'purchase_orders',
    'purchase_order_items',
    'vendor_contracts',
    'sales_forecasts'
  ],
  
  // Marketing and campaigns
  MARKETING: [
    'campaigns',
    'promotions',
    'notifications'
  ],
  
  // Integration and system tables
  SYSTEM: [
    'integration_configs',
    'sync_logs',
    'mobile_devices',
    'ecommerce_products',
    'api_rate_limits',
    'backup_records',
    'competitor_analysis'
  ]
};

// All tables in deletion order (respecting foreign key constraints)
const ALL_TABLES = [
  // Dependent tables first (tables with foreign keys)
  'audit_logs',
  'sync_logs',
  'backup_records',
  'api_rate_limits',
  'mobile_devices',
  'offline_transactions',
  'tips',
  'transaction_payments',
  'transaction_items',
  'held_transactions',
  'cash_sessions',
  'shifts',
  'loyalty_transactions',
  'loyalty_rewards',
  'customer_segment_members',
  'customer_feedback',
  'customer_appointments',
  'prescription_items',
  'prescriptions',
  'drug_interactions',
  'pharmacy_inventory',
  'inventory_adjustment_logs',
  'inventory_transfer_items',
  'inventory_transfers',
  'inventory',
  'bundle_items',
  'product_bundles',
  'kit_components',
  'product_kits',
  'product_variants',
  'product_reviews',
  'price_history',
  'purchase_order_items',
  'purchase_orders',
  'vendor_contracts',
  'maintenance_records',
  'expenses',
  'stock_alerts',
  'reorder_suggestions',
  'sales_forecasts',
  'ecommerce_products',
  'integration_configs',
  'notifications',
  'promotions',
  'campaigns',
  'equipment',
  'competitor_analysis',
  'employee_schedules',
  'staff_invites',
  'transactions',
  
  // Independent tables
  'products',
  'categories',
  'suppliers',
  'customers',
  'customer_segments',
  'patients',
  'doctors',
  'expense_categories',
  'location_settings',
  'users',
  'locations',
  'businesses'
];

/**
 * Get table row counts
 */
async function getTableCounts(tables) {
  const counts = {};
  
  for (const table of tables) {
    try {
      const result = await sql`SELECT COUNT(*) as count FROM ${sql.unsafe(table)}`;
      counts[table] = parseInt(result[0].count);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not count rows in ${table}: ${error.message}`);
      counts[table] = 0;
    }
  }
  
  return counts;
}

/**
 * Delete data from specified tables
 */
async function deleteTables(tables, dryRun = false) {
  const counts = await getTableCounts(tables);
  const totalRows = Object.values(counts).reduce((sum, count) => sum + count, 0);
  
  console.log(`\\n📊 Tables to ${dryRun ? 'analyze' : 'clear'}:`);
  console.log('┌─────────────────────────────────┬──────────┐');
  console.log('│ Table Name                      │ Rows     │');
  console.log('├─────────────────────────────────┼──────────┤');
  
  tables.forEach(table => {
    const count = counts[table] || 0;
    const tableName = table.padEnd(31);
    const rowCount = count.toString().padStart(8);
    console.log(`│ ${tableName} │ ${rowCount} │`);
  });
  
  console.log('├─────────────────────────────────┼──────────┤');
  console.log(`│ ${'TOTAL'.padEnd(31)} │ ${totalRows.toString().padStart(8)} │`);
  console.log('└─────────────────────────────────┴──────────┘');
  
  if (totalRows === 0) {
    console.log('\\n✅ No data to delete - tables are already empty!');
    return;
  }
  
  if (dryRun) {
    console.log(`\\n🔍 DRY RUN: Would delete ${totalRows} rows from ${tables.length} tables`);
    return;
  }
  
  console.log(`\\n🗑️  Deleting ${totalRows} rows from ${tables.length} tables...`);
  
  let deletedCount = 0;
  
  for (const table of tables) {
    const rowCount = counts[table];
    if (rowCount > 0) {
      try {
        console.log(`  Clearing ${table}... (${rowCount} rows)`);
        await sql`DELETE FROM ${sql.unsafe(table)}`;
        deletedCount += rowCount;
        console.log(`  ✅ Cleared ${table}`);
      } catch (error) {
        console.error(`  ❌ Failed to clear ${table}: ${error.message}`);
      }
    } else {
      console.log(`  ⏭️  Skipping ${table} (already empty)`);
    }
  }
  
  console.log(`\\n🎉 Successfully deleted ${deletedCount} rows!`);
}

/**
 * Get confirmation from user
 */
async function getConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main execution function
 */
async function main() {
  console.log('🗑️  HARDYPOS Demo Data Cleanup Script');
  console.log('=====================================\\n');
  
  // Validate options
  const optionCount = [
    options.all,
    options.businessData,
    options.usersOnly,
    options.transactions,
    options.pharmacy
  ].filter(Boolean).length;
  
  if (optionCount === 0) {
    console.log('❌ Please specify what to delete:');
    console.log('   --all              Delete all data');
    console.log('   --business-data    Delete business, products, inventory, transactions');
    console.log('   --users-only       Delete users and auth data');
    console.log('   --transactions     Delete transactions only');
    console.log('   --pharmacy         Delete pharmacy data only');
    console.log('\\nAdd --dry-run to see what would be deleted');
    process.exit(1);
  }
  
  if (optionCount > 1) {
    console.log('❌ Please specify only one deletion option at a time');
    process.exit(1);
  }
  
  // Determine tables to delete
  let tablesToDelete = [];
  let operationType = '';
  
  if (options.all) {
    tablesToDelete = ALL_TABLES;
    operationType = 'ALL DATA';
  } else if (options.businessData) {
    tablesToDelete = [
      ...TABLE_GROUPS.BUSINESS,
      ...TABLE_GROUPS.PRODUCTS,
      ...TABLE_GROUPS.TRANSACTIONS,
      ...TABLE_GROUPS.CUSTOMERS,
      ...TABLE_GROUPS.OPERATIONS
    ];
    operationType = 'BUSINESS DATA';
  } else if (options.usersOnly) {
    tablesToDelete = TABLE_GROUPS.USERS;
    operationType = 'USER DATA';
  } else if (options.transactions) {
    tablesToDelete = TABLE_GROUPS.TRANSACTIONS;
    operationType = 'TRANSACTION DATA';
  } else if (options.pharmacy) {
    tablesToDelete = TABLE_GROUPS.PHARMACY;
    operationType = 'PHARMACY DATA';
  }
  
  // Remove duplicates and sort by deletion order
  tablesToDelete = [...new Set(tablesToDelete)];
  tablesToDelete = ALL_TABLES.filter(table => tablesToDelete.includes(table));
  
  console.log(`🎯 Operation: Delete ${operationType}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL.split('@')[1] || 'Hidden'}`);
  
  if (options.dryRun) {
    console.log('🔍 Mode: DRY RUN (no data will be deleted)');
  } else {
    console.log('⚠️  Mode: LIVE DELETION (data will be permanently deleted)');
  }
  
  // Show confirmation unless --confirm flag is used
  if (!options.confirm && !options.dryRun) {
    console.log('\\n⚠️  WARNING: This action is IRREVERSIBLE!');
    console.log('⚠️  WARNING: All selected data will be PERMANENTLY DELETED!');
    
    const confirmed = await getConfirmation('\\nAre you absolutely sure you want to continue?');
    if (!confirmed) {
      console.log('\\n❌ Operation cancelled by user');
      process.exit(0);
    }
  }
  
  // Execute deletion
  try {
    await deleteTables(tablesToDelete, options.dryRun);
    
    if (!options.dryRun) {
      console.log('\\n✅ Demo data cleanup completed successfully!');
      console.log('\\n💡 To restart with fresh demo data, run:');
      console.log('   node scripts/seed-demo-data.js');
    }
    
  } catch (error) {
    console.error('\\n❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error('\\n❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the script
main().catch(console.error);