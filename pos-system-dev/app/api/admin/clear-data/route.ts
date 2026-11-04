import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { 
  businesses, users, locations, products, inventory, categories, suppliers,
  transactions, transactionItems, heldTransactions, loyaltyTransactions,
  inventoryAdjustmentLogs, inventoryTransfers, inventoryTransferItems,
  staffInvites, employeeSchedules, shifts, cashSessions,
  customers, customerAppointments, customerFeedback, customerSegments, customerSegmentMembers,
  productBundles, bundleItems, productVariants, productReviews, productKits, kitComponents,
  locationSettings, notifications, priceHistory,
  auditLogs, salesForecasts, reorderSuggestions,
  vendorContracts, purchaseOrders, purchaseOrderItems,
  expenses, expenseCategories, equipment, maintenanceRecords,
  competitorAnalysis, backupRecords, apiRateLimits,
  patients, doctors, prescriptions, prescriptionItems, drugInteractions, pharmacyInventory
} from "@/lib/schema";

// DELETE /api/admin/clear-data - Clear all system data (DANGEROUS)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    // Only allow super admin or system admin
    if (!session?.user?.email || !session.user.email.includes('admin')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get("confirm");
    
    if (confirm !== "DELETE_ALL_DATA") {
      return NextResponse.json({ 
        error: "Must include ?confirm=DELETE_ALL_DATA parameter" 
      }, { status: 400 });
    }

    console.log(`🚨 DATA DELETION initiated by: ${session.user.email}`);

    // Delete in order to respect foreign key constraints
    const tablesToClear = [
      // Transaction data
      { table: transactionItems, name: "transaction_items" },
      { table: loyaltyTransactions, name: "loyalty_transactions" },
      { table: transactions, name: "transactions" },
      { table: heldTransactions, name: "held_transactions" },
      
      // Inventory data
      { table: inventoryAdjustmentLogs, name: "inventory_adjustment_logs" },
      { table: inventoryTransferItems, name: "inventory_transfer_items" },
      { table: inventoryTransfers, name: "inventory_transfers" },
      { table: inventory, name: "inventory" },
      
      // Product data
      { table: priceHistory, name: "price_history" },
      { table: productReviews, name: "product_reviews" },
      { table: bundleItems, name: "bundle_items" },
      { table: productBundles, name: "product_bundles" },
      { table: kitComponents, name: "kit_components" },
      { table: productKits, name: "product_kits" },
      { table: productVariants, name: "product_variants" },
      { table: products, name: "products" },
      { table: categories, name: "categories" },
      
      // Pharmacy data
      { table: prescriptionItems, name: "prescription_items" },
      { table: prescriptions, name: "prescriptions" },
      { table: drugInteractions, name: "drug_interactions" },
      { table: pharmacyInventory, name: "pharmacy_inventory" },
      { table: patients, name: "patients" },
      { table: doctors, name: "doctors" },
      
      // Customer data
      { table: customerSegmentMembers, name: "customer_segment_members" },
      { table: customerSegments, name: "customer_segments" },
      { table: customerAppointments, name: "customer_appointments" },
      { table: customerFeedback, name: "customer_feedback" },
      { table: customers, name: "customers" },
      
      // Staff data
      { table: employeeSchedules, name: "employee_schedules" },
      { table: shifts, name: "shifts" },
      { table: cashSessions, name: "cash_sessions" },
      { table: staffInvites, name: "staff_invites" },
      
      // Vendor data
      { table: purchaseOrderItems, name: "purchase_order_items" },
      { table: purchaseOrders, name: "purchase_orders" },
      { table: vendorContracts, name: "vendor_contracts" },
      { table: suppliers, name: "suppliers" },
      
      // Operational data
      { table: maintenanceRecords, name: "maintenance_records" },
      { table: equipment, name: "equipment" },
      { table: expenses, name: "expenses" },
      { table: expenseCategories, name: "expense_categories" },
      
      // Analytics data
      { table: salesForecasts, name: "sales_forecasts" },
      { table: reorderSuggestions, name: "reorder_suggestions" },
      { table: competitorAnalysis, name: "competitor_analysis" },
      { table: auditLogs, name: "audit_logs" },
      { table: backupRecords, name: "backup_records" },
      
      // System data
      { table: notifications, name: "notifications" },
      { table: apiRateLimits, name: "api_rate_limits" },
      { table: locationSettings, name: "location_settings" },
      { table: locations, name: "locations" },
      
      // User data (last)
      { table: users, name: "users" },
      { table: businesses, name: "businesses" },
    ];

    let deletedTables = [];
    let errors = [];

    for (const { table, name } of tablesToClear) {
      try {
        await db.delete(table);
        deletedTables.push(name);
        console.log(`✅ Cleared table: ${name}`);
      } catch (error) {
        console.error(`❌ Error clearing ${name}:`, error);
        errors.push({ table: name, error: error instanceof Error ? error.message : String(error) });
      }
    }

    console.log(`🗑️  Data deletion completed. Cleared ${deletedTables.length} tables.`);

    return NextResponse.json({
      success: true,
      message: "All data has been cleared from the system",
      deletedTables,
      errors: errors.length > 0 ? errors : undefined,
      deletedBy: session.user.email,
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Data deletion failed:", error);
    return NextResponse.json({ 
      error: "Failed to clear data", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}