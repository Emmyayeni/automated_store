#!/usr/bin/env node

/**
 * Quick Demo Data Clear Script
 * 
 * Simple script to quickly clear all demo data from the database.
 * This is a simplified version for immediate use.
 * 
 * Usage:
 *   node scripts/quick-clear.js
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.log('\\nMake sure you have DATABASE_URL set in your .env file:');
  console.log('DATABASE_URL=postgresql://username:password@host:port/database');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Tables in deletion order (foreign key dependencies first)
const TABLES_TO_CLEAR = [
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
 * Clear all demo data
 */
async function clearDemoData() {
  console.log('🗑️  HARDYPOS Quick Data Clear');
  console.log('============================\\n');
  
  console.log('📊 Checking database connection...');
  
  try {
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connected successfully\\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\\nPlease check your DATABASE_URL configuration.');
    process.exit(1);
  }
  
  console.log('🔍 Analyzing data to be cleared...');
  
  // Get row counts
  const counts = {};
  let totalRows = 0;
  
  for (const table of TABLES_TO_CLEAR) {
    try {
      const result = await sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = ${table} AND table_schema = 'public'
      `;
      
      if (result[0].count > 0) {
        const countResult = await sql`SELECT COUNT(*) as count FROM ${sql.unsafe(table)}`;
        counts[table] = parseInt(countResult[0].count);
        totalRows += counts[table];
      } else {
        counts[table] = 0;
      }
    } catch (error) {
      console.warn(`⚠️  Warning: Could not access table ${table}: ${error.message}`);
      counts[table] = 0;
    }
  }
  
  // Show summary
  console.log('\\n📋 Data Summary:');
  console.log('┌─────────────────────────────────┬──────────┐');
  console.log('│ Category                        │ Rows     │');
  console.log('├─────────────────────────────────┼──────────┤');
  
  const categories = {
    'Transactions': ['transactions', 'transaction_items', 'transaction_payments', 'held_transactions'],
    'Products': ['products', 'categories', 'inventory'],
    'Customers': ['customers', 'customer_feedback', 'loyalty_transactions'],
    'Users & Staff': ['users', 'staff_invites', 'shifts'],
    'Business Data': ['businesses', 'locations'],
    'Other Tables': TABLES_TO_CLEAR.filter(t => 
      !['transactions', 'transaction_items', 'transaction_payments', 'held_transactions',
        'products', 'categories', 'inventory',
        'customers', 'customer_feedback', 'loyalty_transactions',
        'users', 'staff_invites', 'shifts',
        'businesses', 'locations'].includes(t))
  };
  
  Object.entries(categories).forEach(([category, tables]) => {
    const categoryTotal = tables.reduce((sum, table) => sum + (counts[table] || 0), 0);
    const categoryName = category.padEnd(31);
    const rowCount = categoryTotal.toString().padStart(8);
    console.log(`│ ${categoryName} │ ${rowCount} │`);
  });
  
  console.log('├─────────────────────────────────┼──────────┤');
  console.log(`│ ${'TOTAL ROWS'.padEnd(31)} │ ${totalRows.toString().padStart(8)} │`);
  console.log('└─────────────────────────────────┴──────────┘');
  
  if (totalRows === 0) {
    console.log('\\n✅ Database is already empty - no data to clear!');
    return;
  }
  
  console.log(`\\n⚠️  WARNING: About to delete ${totalRows} rows from ${Object.keys(counts).filter(t => counts[t] > 0).length} tables`);
  console.log('⚠️  WARNING: This action is IRREVERSIBLE!');
  
  // Simple confirmation
  console.log('\\nPress Ctrl+C to cancel, or press Enter to continue...');
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  console.log('\\n🗑️  Clearing demo data...');
  
  let deletedTables = 0;
  let deletedRows = 0;
  
  for (const table of TABLES_TO_CLEAR) {
    const rowCount = counts[table];
    if (rowCount > 0) {
      try {
        console.log(`  📋 Clearing ${table}... (${rowCount} rows)`);
        await sql`DELETE FROM ${sql.unsafe(table)}`;
        deletedTables++;
        deletedRows += rowCount;
        console.log(`  ✅ Cleared ${table}`);
      } catch (error) {
        console.error(`  ❌ Failed to clear ${table}: ${error.message}`);
      }
    }
  }
  
  console.log(`\\n🎉 Demo data cleared successfully!`);
  console.log(`📊 Deleted ${deletedRows} rows from ${deletedTables} tables`);
  console.log(`\\n💡 Your database is now clean and ready for fresh data.`);
  console.log(`\\n🔧 Next steps:`);
  console.log(`   1. Run your application to create fresh data`);
  console.log(`   2. Or run a seeding script if you have one`);
}

/**
 * Handle errors gracefully
 */
async function main() {
  try {
    await clearDemoData();
  } catch (error) {
    console.error('\\n❌ Error during cleanup:', error.message);
    console.error('\\n🔍 Full error details:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\\n\\n❌ Operation cancelled by user');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('\\n❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the script
main();

async function clearAllData() {
  try {
    console.log("🗑️  Clearing all data...");

    const tables = [
      // Order matters for foreign key constraints
      transactionItems, loyaltyTransactions, transactions, heldTransactions,
      inventoryAdjustmentLogs, inventoryTransferItems, inventoryTransfers, inventory,
      priceHistory, productReviews, bundleItems, productBundles, kitComponents, productKits,
      productVariants, products, categories,
      prescriptionItems, prescriptions, drugInteractions, pharmacyInventory, patients, doctors,
      customerSegmentMembers, customerSegments, customerAppointments, customerFeedback, customers,
      employeeSchedules, shifts, cashSessions, staffInvites,
      purchaseOrderItems, purchaseOrders, vendorContracts, suppliers,
      maintenanceRecords, equipment, expenses, expenseCategories,
      salesForecasts, reorderSuggestions, competitorAnalysis, auditLogs, backupRecords,
      notifications, apiRateLimits, locationSettings, locations,
      users, businesses
    ];

    for (const table of tables) {
      await db.delete(table);
    }

    console.log("✅ All data cleared successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error clearing data:", error);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  clearAllData().then(() => process.exit(0));
}

export { clearAllData };