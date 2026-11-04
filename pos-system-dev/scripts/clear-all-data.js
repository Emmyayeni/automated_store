#!/usr/bin/env node

/**
 * CLEAR ALL DATA SCRIPT
 * This script will delete ALL data from the POS system database
 * WARNING: This action is IRREVERSIBLE
 */

import { db } from "../lib/db.js";
import { 
  // Core business tables
  businesses, users, locations, products, inventory, categories, suppliers,
  
  // Transaction tables
  transactions, transactionItems, heldTransactions, loyaltyTransactions,
  
  // Inventory management
  inventoryAdjustmentLogs, inventoryTransfers, inventoryTransferItems,
  
  // Staff management
  staffInvites, employeeSchedules, shifts, cashSessions,
  
  // Customer management
  customers, customerAppointments, customerFeedback, customerSegments, customerSegmentMembers,
  
  // Product management
  productBundles, bundleItems, productVariants, productReviews, productKits, kitComponents,
  
  // Settings and configuration
  locationSettings, notifications, priceHistory,
  
  // Reporting and analytics
  auditLogs, salesForecasts, reorderSuggestions,
  
  // Vendor and purchasing
  vendorContracts, purchaseOrders, purchaseOrderItems,
  
  // Operational
  expenses, expenseCategories, equipment, maintenanceRecords,
  
  // Analytics and business intelligence
  competitorAnalysis, backupRecords, apiRateLimits,
  
  // Pharmacy specific (if used)
  patients, doctors, prescriptions, prescriptionItems, drugInteractions, pharmacyInventory
} from "../lib/schema.js";

console.log("🚨 WARNING: This will DELETE ALL DATA from your POS system!");
console.log("This includes:");
console.log("- All businesses and user accounts");
console.log("- All products and inventory data");
console.log("- All transaction history and sales data");
console.log("- All customer information");
console.log("- All staff records and shifts");
console.log("- All settings and configurations");
console.log("");

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Are you absolutely sure you want to continue? Type "DELETE ALL DATA" to confirm: ', async (answer) => {
  if (answer !== "DELETE ALL DATA") {
    console.log("❌ Operation cancelled. No data was deleted.");
    rl.close();
    return;
  }

  try {
    console.log("🗑️  Starting data deletion process...");

    // Delete in order to respect foreign key constraints
    // Start with dependent tables first

    console.log("Deleting transaction-related data...");
    await db.delete(transactionItems);
    await db.delete(loyaltyTransactions);
    await db.delete(transactions);
    await db.delete(heldTransactions);

    console.log("Deleting inventory and product data...");
    await db.delete(inventoryAdjustmentLogs);
    await db.delete(inventoryTransferItems);
    await db.delete(inventoryTransfers);
    await db.delete(inventory);
    await db.delete(priceHistory);
    await db.delete(productReviews);
    await db.delete(bundleItems);
    await db.delete(productBundles);
    await db.delete(kitComponents);
    await db.delete(productKits);
    await db.delete(productVariants);
    await db.delete(products);
    await db.delete(categories);

    console.log("Deleting pharmacy data...");
    await db.delete(prescriptionItems);
    await db.delete(prescriptions);
    await db.delete(drugInteractions);
    await db.delete(pharmacyInventory);
    await db.delete(patients);
    await db.delete(doctors);

    console.log("Deleting customer data...");
    await db.delete(customerSegmentMembers);
    await db.delete(customerSegments);
    await db.delete(customerAppointments);
    await db.delete(customerFeedback);
    await db.delete(customers);

    console.log("Deleting staff and operational data...");
    await db.delete(employeeSchedules);
    await db.delete(shifts);
    await db.delete(cashSessions);
    await db.delete(staffInvites);

    console.log("Deleting vendor and purchasing data...");
    await db.delete(purchaseOrderItems);
    await db.delete(purchaseOrders);
    await db.delete(vendorContracts);
    await db.delete(suppliers);

    console.log("Deleting operational and equipment data...");
    await db.delete(maintenanceRecords);
    await db.delete(equipment);
    await db.delete(expenses);
    await db.delete(expenseCategories);

    console.log("Deleting analytics and reporting data...");
    await db.delete(salesForecasts);
    await db.delete(reorderSuggestions);
    await db.delete(competitorAnalysis);
    await db.delete(auditLogs);
    await db.delete(backupRecords);

    console.log("Deleting system configuration...");
    await db.delete(notifications);
    await db.delete(apiRateLimits);
    await db.delete(locationSettings);
    await db.delete(locations);

    console.log("Deleting user accounts and businesses...");
    await db.delete(users);
    await db.delete(businesses);

    console.log("✅ ALL DATA HAS BEEN SUCCESSFULLY DELETED!");
    console.log("");
    console.log("Your POS system is now completely clean with:");
    console.log("- No user accounts");
    console.log("- No business data");
    console.log("- No products or inventory");
    console.log("- No transaction history");
    console.log("- No customer records");
    console.log("- No system settings");
    console.log("");
    console.log("You can now start fresh by going to /onboarding to set up a new business.");

  } catch (error) {
    console.error("❌ Error during data deletion:", error);
    console.log("Some data may have been partially deleted.");
    console.log("You may need to manually check and clean up remaining data.");
  } finally {
    rl.close();
    process.exit(0);
  }
});
