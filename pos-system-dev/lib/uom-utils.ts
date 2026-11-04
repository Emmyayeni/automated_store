import { db } from "@/lib/db";
import { 
  unitsOfMeasure, 
  productUoms, 
  uomConversions, 
  inventoryByUom, 
  productPackagingHierarchy,
  inventory,
  products
} from "@/lib/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

// Types for UOM operations
export interface UOMConversionResult {
  success: boolean;
  convertedQuantity?: number;
  error?: string;
}

export interface ProductUOMInfo {
  id: string;
  uomId: string;
  uomCode: string;
  uomName: string;
  uomAbbreviation: string;
  conversionFactor: number;
  pricePerUnit?: number;
  isBaseUom: boolean;
  isSellingUom: boolean;
  isPurchasingUom: boolean;
  barcode?: string;
  skuSuffix?: string;
}

export interface InventoryUOMStatus {
  uomId: string;
  uomCode: string;
  uomName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  conversionFactor: number;
}

// ===== UOM CONVERSION UTILITIES =====

/**
 * Convert quantity from one UOM to another for a specific product
 */
export async function convertProductQuantity(
  productId: string,
  fromUomId: string,
  toUomId: string,
  quantity: number
): Promise<UOMConversionResult> {
  try {
    // If same UOM, no conversion needed
    if (fromUomId === toUomId) {
      return { success: true, convertedQuantity: quantity };
    }

    // Get UOM information for the product
    const productUOMs = await db
      .select({
        uomId: productUoms.uomId,
        conversionFactor: productUoms.conversionFactor,
        isBaseUom: productUoms.isBaseUom,
      })
      .from(productUoms)
      .where(eq(productUoms.productId, productId));

    const fromUOM = productUOMs.find(u => u.uomId === fromUomId);
    const toUOM = productUOMs.find(u => u.uomId === toUomId);

    if (!fromUOM || !toUOM) {
      return { 
        success: false, 
        error: "One or both UOMs not configured for this product" 
      };
    }

    // Convert through base unit
    // First convert from source UOM to base units
    const baseQuantity = quantity * Number(fromUOM.conversionFactor);
    
    // Then convert from base units to target UOM
    const convertedQuantity = baseQuantity / Number(toUOM.conversionFactor);

    return { success: true, convertedQuantity };
  } catch (error) {
    console.error("UOM conversion error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown conversion error" 
    };
  }
}

/**
 * Get all available UOMs for a product with their details
 */
export async function getProductUOMs(productId: string): Promise<ProductUOMInfo[]> {
  const result = await db
    .select({
      id: productUoms.id,
      uomId: productUoms.uomId,
      uomCode: unitsOfMeasure.code,
      uomName: unitsOfMeasure.name,
      uomAbbreviation: unitsOfMeasure.abbreviation,
      conversionFactor: productUoms.conversionFactor,
      pricePerUnit: productUoms.pricePerUnit,
      isBaseUom: productUoms.isBaseUom,
      isSellingUom: productUoms.isSellingUom,
      isPurchasingUom: productUoms.isPurchasingUom,
      barcode: productUoms.barcode,
      skuSuffix: productUoms.skuSuffix,
    })
    .from(productUoms)
    .innerJoin(unitsOfMeasure, eq(productUoms.uomId, unitsOfMeasure.id))
    .where(eq(productUoms.productId, productId))
    .orderBy(productUoms.conversionFactor);

  return result.map(row => ({
    id: row.id,
    uomId: row.uomId,
    uomCode: row.uomCode,
    uomName: row.uomName,
    uomAbbreviation: row.uomAbbreviation,
    conversionFactor: Number(row.conversionFactor),
    pricePerUnit: row.pricePerUnit ? Number(row.pricePerUnit) : undefined,
    isBaseUom: row.isBaseUom || false,
    isSellingUom: row.isSellingUom || false,
    isPurchasingUom: row.isPurchasingUom || false,
    barcode: row.barcode || undefined,
    skuSuffix: row.skuSuffix || undefined,
  }));
}

/**
 * Get the base UOM for a product
 */
export async function getProductBaseUOM(productId: string): Promise<ProductUOMInfo | null> {
  const result = await db
    .select({
      id: productUoms.id,
      uomId: productUoms.uomId,
      uomCode: unitsOfMeasure.code,
      uomName: unitsOfMeasure.name,
      uomAbbreviation: unitsOfMeasure.abbreviation,
      conversionFactor: productUoms.conversionFactor,
      pricePerUnit: productUoms.pricePerUnit,
      isBaseUom: productUoms.isBaseUom,
      isSellingUom: productUoms.isSellingUom,
      isPurchasingUom: productUoms.isPurchasingUom,
      barcode: productUoms.barcode,
      skuSuffix: productUoms.skuSuffix,
    })
    .from(productUoms)
    .innerJoin(unitsOfMeasure, eq(productUoms.uomId, unitsOfMeasure.id))
    .where(and(
      eq(productUoms.productId, productId),
      eq(productUoms.isBaseUom, true)
    ))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    uomId: row.uomId,
    uomCode: row.uomCode,
    uomName: row.uomName,
    uomAbbreviation: row.uomAbbreviation,
    conversionFactor: Number(row.conversionFactor),
    pricePerUnit: row.pricePerUnit ? Number(row.pricePerUnit) : undefined,
    isBaseUom: row.isBaseUom || false,
    isSellingUom: row.isSellingUom || false,
    isPurchasingUom: row.isPurchasingUom || false,
    barcode: row.barcode || undefined,
    skuSuffix: row.skuSuffix || undefined,
  };
}

/**
 * Calculate price for a specific UOM and quantity
 */
export async function calculateUOMPrice(
  productId: string,
  uomId: string,
  quantity: number,
  basePrice?: number
): Promise<{ success: boolean; totalPrice?: number; unitPrice?: number; error?: string }> {
  try {
    const productUOM = await db
      .select({
        conversionFactor: productUoms.conversionFactor,
        pricePerUnit: productUoms.pricePerUnit,
      })
      .from(productUoms)
      .where(and(
        eq(productUoms.productId, productId),
        eq(productUoms.uomId, uomId)
      ))
      .limit(1);

    if (productUOM.length === 0) {
      return { success: false, error: "UOM not configured for this product" };
    }

    const uom = productUOM[0];
    
    // Use specific UOM price if available, otherwise calculate from base price
    let unitPrice: number;
    if (uom.pricePerUnit) {
      unitPrice = Number(uom.pricePerUnit);
    } else if (basePrice) {
      // Calculate based on conversion factor
      unitPrice = basePrice * Number(uom.conversionFactor);
    } else {
      return { success: false, error: "No price information available" };
    }

    const totalPrice = unitPrice * quantity;

    return { success: true, totalPrice, unitPrice };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Price calculation error" 
    };
  }
}

// ===== INVENTORY UOM UTILITIES =====

/**
 * Get inventory status for all UOMs of a product at a location
 */
export async function getInventoryByUOMs(
  locationId: string,
  productId: string
): Promise<InventoryUOMStatus[]> {
  const result = await db
    .select({
      uomId: inventoryByUom.uomId,
      uomCode: unitsOfMeasure.code,
      uomName: unitsOfMeasure.name,
      quantity: inventoryByUom.quantity,
      reservedQuantity: inventoryByUom.reservedQuantity,
      conversionFactor: productUoms.conversionFactor,
    })
    .from(inventoryByUom)
    .innerJoin(inventory, eq(inventoryByUom.inventoryId, inventory.id))
    .innerJoin(unitsOfMeasure, eq(inventoryByUom.uomId, unitsOfMeasure.id))
    .innerJoin(productUoms, and(
      eq(productUoms.productId, productId),
      eq(productUoms.uomId, inventoryByUom.uomId)
    ))
    .where(and(
      eq(inventory.locationId, locationId),
      eq(inventory.productId, productId)
    ));

  return result.map(row => ({
    uomId: row.uomId,
    uomCode: row.uomCode,
    uomName: row.uomName,
    quantity: Number(row.quantity),
    reservedQuantity: Number(row.reservedQuantity),
    availableQuantity: Number(row.quantity) - Number(row.reservedQuantity),
    conversionFactor: Number(row.conversionFactor),
  }));
}

/**
 * Update inventory for a specific UOM
 */
export async function updateInventoryUOM(
  locationId: string,
  productId: string,
  uomId: string,
  quantityChange: number,
  reason: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get inventory record
    const inventoryRecord = await db
      .select({ id: inventory.id })
      .from(inventory)
      .where(and(
        eq(inventory.locationId, locationId),
        eq(inventory.productId, productId)
      ))
      .limit(1);

    if (inventoryRecord.length === 0) {
      return { success: false, error: "Inventory record not found" };
    }

    const inventoryId = inventoryRecord[0].id;

    // Check if UOM inventory record exists
    const uomInventory = await db
      .select({ 
        id: inventoryByUom.id, 
        quantity: inventoryByUom.quantity 
      })
      .from(inventoryByUom)
      .where(and(
        eq(inventoryByUom.inventoryId, inventoryId),
        eq(inventoryByUom.uomId, uomId)
      ))
      .limit(1);

    if (uomInventory.length === 0) {
      // Create new UOM inventory record
      await db.insert(inventoryByUom).values({
        inventoryId,
        uomId,
        quantity: Math.max(0, quantityChange).toString(),
        reservedQuantity: "0",
      });
    } else {
      // Update existing record
      const newQuantity = Math.max(0, Number(uomInventory[0].quantity) + quantityChange);
      await db
        .update(inventoryByUom)
        .set({ 
          quantity: newQuantity.toString(),
          updatedAt: new Date(),
        })
        .where(eq(inventoryByUom.id, uomInventory[0].id));
    }

    // Also update main inventory table (convert to base units)
    const baseUOM = await getProductBaseUOM(productId);
    if (baseUOM) {
      const conversionResult = await convertProductQuantity(
        productId, 
        uomId, 
        baseUOM.uomId, 
        quantityChange
      );

      if (conversionResult.success && conversionResult.convertedQuantity !== undefined) {
        await db
          .update(inventory)
          .set({ 
            quantity: sql`GREATEST(0, quantity + ${conversionResult.convertedQuantity})`,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, inventoryId));
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Inventory UOM update error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Inventory update failed" 
    };
  }
}

// ===== PACKAGING HIERARCHY UTILITIES =====

/**
 * Get packaging hierarchy for a product (e.g., Pack -> Card -> Strip -> Tablet)
 */
export async function getProductPackagingHierarchy(productId: string) {
  const result = await db
    .select({
      id: productPackagingHierarchy.id,
      parentUomId: productPackagingHierarchy.parentUomId,
      parentUomCode: sql`parent_uom.code`.as('parentUomCode'),
      parentUomName: sql`parent_uom.name`.as('parentUomName'),
      childUomId: productPackagingHierarchy.childUomId,
      childUomCode: sql`child_uom.code`.as('childUomCode'),
      childUomName: sql`child_uom.name`.as('childUomName'),
      quantityPerParent: productPackagingHierarchy.quantityPerParent,
      levelOrder: productPackagingHierarchy.levelOrder,
    })
    .from(productPackagingHierarchy)
    .innerJoin(
      sql`units_of_measure AS parent_uom`,
      eq(productPackagingHierarchy.parentUomId, sql`parent_uom.id`)
    )
    .innerJoin(
      sql`units_of_measure AS child_uom`,
      eq(productPackagingHierarchy.childUomId, sql`child_uom.id`)
    )
    .where(eq(productPackagingHierarchy.productId, productId))
    .orderBy(productPackagingHierarchy.levelOrder);

  return result.map(row => ({
    id: row.id,
    parentUomId: row.parentUomId,
    parentUomCode: row.parentUomCode as string,
    parentUomName: row.parentUomName as string,
    childUomId: row.childUomId,
    childUomCode: row.childUomCode as string,
    childUomName: row.childUomName as string,
    quantityPerParent: Number(row.quantityPerParent),
    levelOrder: row.levelOrder,
  }));
}

/**
 * Calculate breakdown of quantities across packaging hierarchy
 * Example: 65 tablets = 1 pack + 0 cards + 1 strip + 5 tablets
 */
export async function calculatePackagingBreakdown(
  productId: string,
  baseQuantity: number
): Promise<{ [uomCode: string]: number }> {
  const hierarchy = await getProductPackagingHierarchy(productId);
  const baseUOM = await getProductBaseUOM(productId);
  
  if (!baseUOM || hierarchy.length === 0) {
    return { [baseUOM?.uomCode || 'units']: baseQuantity };
  }

  // Sort hierarchy by level order (highest packages first)
  const sortedHierarchy = hierarchy.sort((a, b) => a.levelOrder - b.levelOrder);
  
  let remainingQuantity = baseQuantity;
  const breakdown: { [uomCode: string]: number } = {};

  // Work through hierarchy from largest to smallest packages
  for (const level of sortedHierarchy) {
    const productUOM = await db
      .select({ conversionFactor: productUoms.conversionFactor })
      .from(productUoms)
      .where(and(
        eq(productUoms.productId, productId),
        eq(productUoms.uomId, level.parentUomId)
      ))
      .limit(1);

    if (productUOM.length > 0) {
      const unitsPerPackage = Number(productUOM[0].conversionFactor);
      const packagesCount = Math.floor(remainingQuantity / unitsPerPackage);
      
      if (packagesCount > 0) {
        breakdown[level.parentUomCode] = packagesCount;
        remainingQuantity -= packagesCount * unitsPerPackage;
      }
    }
  }

  // Add remaining base units
  if (remainingQuantity > 0) {
    breakdown[baseUOM.uomCode] = remainingQuantity;
  }

  return breakdown;
}

// ===== BUSINESS UOM UTILITIES =====

/**
 * Get all UOMs for a business
 */
export async function getBusinessUOMs(businessId: string) {
  return await db
    .select()
    .from(unitsOfMeasure)
    .where(and(
      eq(unitsOfMeasure.businessId, businessId),
      eq(unitsOfMeasure.isActive, true)
    ))
    .orderBy(unitsOfMeasure.category, unitsOfMeasure.name);
}

/**
 * Create default pharmaceutical UOMs for a business
 */
export async function createDefaultPharmacyUOMs(businessId: string) {
  const defaultUOMs = [
    { code: 'TAB', name: 'Tablet', abbreviation: 'tab', category: 'packaging' as const, isBaseUnit: true },
    { code: 'CAP', name: 'Capsule', abbreviation: 'cap', category: 'packaging' as const, isBaseUnit: true },
    { code: 'STRIP', name: 'Strip', abbreviation: 'strip', category: 'packaging' as const, isBaseUnit: false },
    { code: 'CARD', name: 'Card', abbreviation: 'card', category: 'packaging' as const, isBaseUnit: false },
    { code: 'PACK', name: 'Pack', abbreviation: 'pack', category: 'packaging' as const, isBaseUnit: false },
    { code: 'BOX', name: 'Box', abbreviation: 'box', category: 'packaging' as const, isBaseUnit: false },
    { code: 'BOTTLE', name: 'Bottle', abbreviation: 'bottle', category: 'packaging' as const, isBaseUnit: false },
    { code: 'VIAL', name: 'Vial', abbreviation: 'vial', category: 'packaging' as const, isBaseUnit: false },
    { code: 'ML', name: 'Milliliter', abbreviation: 'ml', category: 'volume' as const, isBaseUnit: true },
    { code: 'MG', name: 'Milligram', abbreviation: 'mg', category: 'weight' as const, isBaseUnit: true },
    { code: 'PIECE', name: 'Piece', abbreviation: 'pc', category: 'count' as const, isBaseUnit: true },
  ];

  for (const uom of defaultUOMs) {
    try {
      await db.insert(unitsOfMeasure).values({
        businessId,
        ...uom,
      });
    } catch (error) {
      // Ignore duplicate key errors
      console.log(`UOM ${uom.code} already exists for business ${businessId}`);
    }
  }
}