import { db } from "@/lib/db";
import { inventory, inventoryAdjustmentLogs, stockMovements, users, locations, products, inventoryByUom, productUoms, unitsOfMeasure } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { convertProductQuantity, getProductBaseUOM, updateInventoryUOM } from "./uom-utils";

export interface InventoryAdjustmentInput {
  locationId: string;
  productId: string;
  adjustmentType: 'manual' | 'sale' | 'return' | 'waste' | 'theft' | 'damage' | 'recount' | 'transfer_in' | 'transfer_out' | 'production' | 'expired';
  adjustmentQuantity: number;
  uomId?: string; // Optional UOM for the adjustment
  reason: string;
  adjustedBy: string;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
}

export interface InventoryWithUOM {
  inventoryId: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  baseQuantity: number;
  uomBreakdown: Array<{
    uomId: string;
    uomCode: string;
    uomName: string;
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  }>;
}

/**
 * Adjusts inventory quantity and logs the change with UOM support
 */
export async function adjustInventoryWithLog(input: InventoryAdjustmentInput) {
  const {
    locationId,
    productId,
    adjustmentType,
    adjustmentQuantity,
    uomId,
    reason,
    adjustedBy,
    referenceId,
    referenceType,
    notes
  } = input;

  // Get current inventory
  const [currentInventory] = await db
    .select()
    .from(inventory)
    .where(and(
      eq(inventory.locationId, locationId),
      eq(inventory.productId, productId)
    ));

  if (!currentInventory) {
    throw new Error(`Inventory record not found for product ${productId} at location ${locationId}`);
  }

  let baseUnitAdjustment = adjustmentQuantity;
  let adjustmentUomId = uomId;

  // If UOM is specified, convert to base units
  if (uomId) {
    const baseUOM = await getProductBaseUOM(productId);
    if (!baseUOM) {
      throw new Error(`No base UOM configured for product ${productId}`);
    }

    if (uomId !== baseUOM.uomId) {
      const conversionResult = await convertProductQuantity(
        productId,
        uomId,
        baseUOM.uomId,
        adjustmentQuantity
      );

      if (!conversionResult.success) {
        throw new Error(`UOM conversion failed: ${conversionResult.error}`);
      }

      baseUnitAdjustment = conversionResult.convertedQuantity!;
    }
    adjustmentUomId = uomId;
  } else {
    // Use base UOM if no UOM specified
    const baseUOM = await getProductBaseUOM(productId);
    adjustmentUomId = baseUOM?.uomId;
  }

  const previousQuantity = currentInventory.quantity;
  const newQuantity = Math.max(0, previousQuantity + baseUnitAdjustment);

  // Update main inventory table
  const [updatedInventory] = await db
    .update(inventory)
    .set({
      quantity: newQuantity,
      updatedAt: new Date(),
    })
    .where(and(
      eq(inventory.locationId, locationId),
      eq(inventory.productId, productId)
    ))
    .returning();

  // Update UOM-specific inventory if UOM is specified
  if (adjustmentUomId) {
    await updateInventoryUOM(
      locationId,
      productId,
      adjustmentUomId,
      adjustmentQuantity,
      reason,
      adjustedBy
    );
  }

  // Log the adjustment
  const [adjustmentLog] = await db
    .insert(inventoryAdjustmentLogs)
    .values({
      locationId,
      productId,
      adjustmentType,
      previousQuantity,
      adjustmentQuantity: baseUnitAdjustment,
      newQuantity,
      reason,
      adjustedBy,
      referenceId,
      referenceType,
      notes: notes ? `${notes}${adjustmentUomId ? ` (UOM: ${adjustmentUomId})` : ''}` : (adjustmentUomId ? `UOM: ${adjustmentUomId}` : undefined),
    })
    .returning();

  // Also log into central stock movements ledger
  try {
    const reasonNormalized =
      reason?.toUpperCase().includes("DAMAGE")
        ? "DAMAGED"
        : reason?.toUpperCase().includes("EXPIRE")
        ? "EXPIRED"
        : reason?.toUpperCase().includes("SALE")
        ? "SALE"
        : "ADJUSTMENT";

    await db.insert(stockMovements).values({
      locationId,
      productId,
      userId: adjustedBy,
      movementType: "ADJUSTMENT",
      quantity: Math.abs(baseUnitAdjustment),
      balanceBefore: previousQuantity,
      balanceAfter: newQuantity,
      reason: reasonNormalized as any,
      reference: referenceId || "MANUAL_ADJUSTMENT",
      notes: notes || reason || "Inventory balance correction",
    });
  } catch (movErr) {
    console.warn("Could not log to stockMovements:", movErr);
  }

  return {
    inventory: updatedInventory,
    log: adjustmentLog,
  };
}

/**
 * Adjusts multiple inventory items with logging
 */
export async function adjustMultipleInventoryWithLog(adjustments: InventoryAdjustmentInput[]) {
  const results = [];
  
  for (const adjustment of adjustments) {
    const result = await adjustInventoryWithLog(adjustment);
    results.push(result);
  }
  
  return results;
}

/**
 * Gets inventory adjustment history for a product or location
 */
export async function getInventoryAdjustmentHistory(
  locationId?: string,
  productId?: string,
  limit = 100
) {
  const conditions = [];
  
  if (locationId) {
    conditions.push(eq(inventoryAdjustmentLogs.locationId, locationId));
  }
  
  if (productId) {
    conditions.push(eq(inventoryAdjustmentLogs.productId, productId));
  }

  let query = db
    .select({
      id: inventoryAdjustmentLogs.id,
      locationId: inventoryAdjustmentLogs.locationId,
      productId: inventoryAdjustmentLogs.productId,
      adjustmentType: inventoryAdjustmentLogs.adjustmentType,
      previousQuantity: inventoryAdjustmentLogs.previousQuantity,
      adjustmentQuantity: inventoryAdjustmentLogs.adjustmentQuantity,
      newQuantity: inventoryAdjustmentLogs.newQuantity,
      reason: inventoryAdjustmentLogs.reason,
      adjustedBy: inventoryAdjustmentLogs.adjustedBy,
      referenceId: inventoryAdjustmentLogs.referenceId,
      referenceType: inventoryAdjustmentLogs.referenceType,
      notes: inventoryAdjustmentLogs.notes,
      createdAt: inventoryAdjustmentLogs.createdAt,
      userEmail: users.email,
      locationName: locations.name,
      productName: products.name,
    })
    .from(inventoryAdjustmentLogs)
    .leftJoin(users, eq(inventoryAdjustmentLogs.adjustedBy, users.id))
    .leftJoin(locations, eq(inventoryAdjustmentLogs.locationId, locations.id))
    .leftJoin(products, eq(inventoryAdjustmentLogs.productId, products.id))
    .orderBy(inventoryAdjustmentLogs.createdAt)
    .limit(limit);

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

/**
 * Check if user has permission to adjust inventory
 */
export function canAdjustInventory(userRole: string): boolean {
  // Convert to lowercase to match our role definitions
  const normalizedRole = userRole?.toLowerCase() || "";
  return ['admin', 'manager', 'branch_manager'].includes(normalizedRole);
}

/**
 * Validate adjustment input with UOM support
 */
export function validateAdjustmentInput(input: InventoryAdjustmentInput) {
  const errors: string[] = [];

  if (!input.locationId) errors.push('Location ID is required');
  if (!input.productId) errors.push('Product ID is required');
  if (!input.adjustmentType) errors.push('Adjustment type is required');
  if (typeof input.adjustmentQuantity !== 'number') errors.push('Adjustment quantity must be a number');
  if (!input.reason || input.reason.trim().length === 0) errors.push('Reason is required');
  if (!input.adjustedBy) errors.push('Adjusted by user ID is required');

  // Validate adjustment type
  const validTypes = ['manual', 'sale', 'return', 'waste', 'theft', 'damage', 'recount', 'transfer_in', 'transfer_out', 'production', 'expired'];
  if (!validTypes.includes(input.adjustmentType)) {
    errors.push(`Invalid adjustment type. Must be one of: ${validTypes.join(', ')}`);
  }

  return errors;
}

/**
 * Get comprehensive inventory information with UOM breakdown
 */
export async function getInventoryWithUOM(
  locationId?: string,
  productId?: string,
  limit = 100
): Promise<InventoryWithUOM[]> {
  const conditions = [];
  
  if (locationId) {
    conditions.push(eq(inventory.locationId, locationId));
  }
  
  if (productId) {
    conditions.push(eq(inventory.productId, productId));
  }

  // Get base inventory data
  const baseQuery = db
    .select({
      inventoryId: inventory.id,
      productId: inventory.productId,
      productName: products.name,
      locationId: inventory.locationId,
      locationName: locations.name,
      baseQuantity: inventory.quantity,
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .leftJoin(locations, eq(inventory.locationId, locations.id));

  const query = conditions.length > 0 
    ? baseQuery.where(and(...conditions))
    : baseQuery;

  const inventoryRecords = await query.limit(limit);

  // For each inventory record, get UOM breakdown
  const result: InventoryWithUOM[] = [];
  
  for (const record of inventoryRecords) {
    const uomBreakdown = await db
      .select({
        uomId: inventoryByUom.uomId,
        uomCode: unitsOfMeasure.code,
        uomName: unitsOfMeasure.name,
        quantity: inventoryByUom.quantity,
        reservedQuantity: inventoryByUom.reservedQuantity,
      })
      .from(inventoryByUom)
      .innerJoin(unitsOfMeasure, eq(inventoryByUom.uomId, unitsOfMeasure.id))
      .where(eq(inventoryByUom.inventoryId, record.inventoryId));

    result.push({
      inventoryId: record.inventoryId,
      productId: record.productId,
      productName: record.productName || 'Unknown Product',
      locationId: record.locationId,
      locationName: record.locationName || 'Unknown Location',
      baseQuantity: record.baseQuantity,
      uomBreakdown: uomBreakdown.map(uom => ({
        uomId: uom.uomId,
        uomCode: uom.uomCode,
        uomName: uom.uomName,
        quantity: Number(uom.quantity),
        reservedQuantity: Number(uom.reservedQuantity),
        availableQuantity: Number(uom.quantity) - Number(uom.reservedQuantity),
      })),
    });
  }

  return result;
}

/**
 * Process sales transaction with UOM support
 */
export async function processSaleTransaction(
  locationId: string,
  productId: string,
  soldQuantity: number,
  soldUomId: string,
  userId: string,
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert sold quantity to base units
    const baseUOM = await getProductBaseUOM(productId);
    if (!baseUOM) {
      return { success: false, error: "No base UOM configured for product" };
    }

    let baseUnitsSold = soldQuantity;
    if (soldUomId !== baseUOM.uomId) {
      const conversionResult = await convertProductQuantity(
        productId,
        soldUomId,
        baseUOM.uomId,
        soldQuantity
      );

      if (!conversionResult.success) {
        return { success: false, error: `UOM conversion failed: ${conversionResult.error}` };
      }

      baseUnitsSold = conversionResult.convertedQuantity!;
    }

    // Adjust inventory
    await adjustInventoryWithLog({
      locationId,
      productId,
      adjustmentType: 'sale',
      adjustmentQuantity: -baseUnitsSold, // Negative for sale
      uomId: soldUomId,
      reason: `Sale transaction`,
      adjustedBy: userId,
      referenceId: transactionId,
      referenceType: 'transaction',
    });

    return { success: true };
  } catch (error) {
    console.error("Sale transaction processing error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Transaction processing failed" 
    };
  }
}

/**
 * Check if sufficient stock is available for a sale in specific UOM
 */
export async function checkStockAvailability(
  locationId: string,
  productId: string,
  requiredQuantity: number,
  uomId: string
): Promise<{ available: boolean; currentStock?: number; error?: string }> {
  try {
    // Get inventory record
    const inventoryRecord = await db
      .select({ id: inventory.id, quantity: inventory.quantity })
      .from(inventory)
      .where(and(
        eq(inventory.locationId, locationId),
        eq(inventory.productId, productId)
      ))
      .limit(1);

    if (inventoryRecord.length === 0) {
      return { available: false, error: "Product not found in inventory" };
    }

    // Convert required quantity to base units for comparison
    const baseUOM = await getProductBaseUOM(productId);
    if (!baseUOM) {
      return { available: false, error: "No base UOM configured for product" };
    }

    let baseUnitsRequired = requiredQuantity;
    if (uomId !== baseUOM.uomId) {
      const conversionResult = await convertProductQuantity(
        productId,
        uomId,
        baseUOM.uomId,
        requiredQuantity
      );

      if (!conversionResult.success) {
        return { available: false, error: `UOM conversion failed: ${conversionResult.error}` };
      }

      baseUnitsRequired = conversionResult.convertedQuantity!;
    }

    const currentStock = inventoryRecord[0].quantity;
    const available = currentStock >= baseUnitsRequired;

    return { available, currentStock };
  } catch (error) {
    console.error("Stock availability check error:", error);
    return { 
      available: false, 
      error: error instanceof Error ? error.message : "Stock check failed" 
    };
  }
}
