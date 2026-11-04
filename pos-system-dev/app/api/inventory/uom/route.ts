import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, inventory, inventoryByUom, productUoms, unitsOfMeasure } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { 
  createSuccessResponse, 
  createErrorResponse,
  createAuthErrorResponse,
  createAuthorizationErrorResponse,
  handleApiError,
  createErrorContext,
  validateRole
} from '@/lib/standards';

export interface UOMInventoryProduct {
  id: string;
  name: string;
  strength?: string;
  manufacturer?: string;
  category: string;
  stockLevels: {
    packs: number;
    cards: number;
    strips: number;
    baseUnits: number;
    baseUnitName: string;
  };
  pricing: {
    perPack: number;
    perCard: number;
    perStrip: number;
    perBaseUnit: number;
  };
  lowStockAlert: boolean;
  canSell: boolean;
  lastUpdated: string;
}

// GET /api/inventory/uom?locationId=...
export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const accessControl = await validateRole(['ADMIN', 'MANAGER', 'CASHIER']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error!);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    if (!locationId) {
      return NextResponse.json(createErrorResponse(
        "Location ID is required", 
        "MISSING_LOCATION_ID"
      ), { status: 400 });
    }

    // Get products with UOM configuration and inventory
    const result = await db
      .select({
        productId: products.id,
        productName: products.name,
        productCategory: products.category,
        productStrength: products.strength,
        productManufacturer: products.manufacturer,
        inventoryId: inventory.id,
        inventoryQuantity: inventory.quantity,
        inventoryUpdatedAt: inventory.updatedAt,
        minStockLevel: inventory.minStockLevel,
        uomId: unitsOfMeasure.id,
        uomCode: unitsOfMeasure.code,
        uomName: unitsOfMeasure.name,
        uomCategory: unitsOfMeasure.category,
        isBaseUom: productUoms.isBaseUom,
        isSellingUom: productUoms.isSellingUom,
        conversionFactor: productUoms.conversionFactor,
        pricePerUnit: productUoms.pricePerUnit,
        uomQuantity: inventoryByUom.quantity,
      })
      .from(products)
      .innerJoin(inventory, eq(inventory.productId, products.id))
      .innerJoin(productUoms, eq(productUoms.productId, products.id))
      .innerJoin(unitsOfMeasure, eq(unitsOfMeasure.id, productUoms.uomId))
      .leftJoin(inventoryByUom, and(
        eq(inventoryByUom.inventoryId, inventory.id),
        eq(inventoryByUom.uomId, unitsOfMeasure.id)
      ))
      .where(and(
        eq(inventory.locationId, locationId),
        eq(products.isActive, true),
        eq(productUoms.isSellingUom, true)
      ))
      .orderBy(products.name, unitsOfMeasure.code);

    // Group by product and build UOM structure
    const productMap = new Map<string, any>();

    result.forEach(row => {
      const productId = row.productId;
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: productId,
          name: row.productName,
          strength: row.productStrength,
          manufacturer: row.productManufacturer,
          category: row.productCategory,
          inventoryUpdatedAt: row.inventoryUpdatedAt,
          minStockLevel: row.minStockLevel,
          uoms: [],
          baseUnitName: 'units'
        });
      }

      const product = productMap.get(productId);
      const uomQuantity = row.uomQuantity ? parseFloat(row.uomQuantity) : 0;
      const conversionFactor = parseFloat(row.conversionFactor);
      const pricePerUnit = row.pricePerUnit ? parseFloat(row.pricePerUnit) : 0;

      product.uoms.push({
        code: row.uomCode,
        name: row.uomName,
        category: row.uomCategory,
        isBaseUom: row.isBaseUom,
        conversionFactor,
        quantity: uomQuantity,
        pricePerUnit
      });

      // Set base unit name
      if (row.isBaseUom) {
        product.baseUnitName = row.uomName.toLowerCase();
      }
    });

    // Convert to the expected format
    const formattedProducts: UOMInventoryProduct[] = Array.from(productMap.values()).map(product => {
      // Initialize stock levels
      const stockLevels = {
        packs: 0,
        cards: 0,
        strips: 0,
        baseUnits: 0,
        baseUnitName: product.baseUnitName
      };

      // Initialize pricing
      const pricing = {
        perPack: 0,
        perCard: 0,
        perStrip: 0,
        perBaseUnit: 0
      };

      // Map UOM data to expected structure
      product.uoms.forEach((uom: any) => {
        const quantity = uom.quantity || 0;
        const price = uom.pricePerUnit || 0;

        switch (uom.code.toUpperCase()) {
          case 'PACK':
            stockLevels.packs = quantity;
            pricing.perPack = price;
            break;
          case 'CARD':
            stockLevels.cards = quantity;
            pricing.perCard = price;
            break;
          case 'STRIP':
            stockLevels.strips = quantity;
            pricing.perStrip = price;
            break;
          default:
            if (uom.isBaseUom) {
              stockLevels.baseUnits = quantity;
              pricing.perBaseUnit = price;
            }
            break;
        }
      });

      // Calculate stock alerts and availability
      const totalStock = stockLevels.packs + stockLevels.cards + stockLevels.strips;
      const lowStockAlert = totalStock <= (product.minStockLevel || 5);
      const canSell = stockLevels.packs > 0 || stockLevels.cards > 0 || stockLevels.strips > 0;

      return {
        id: product.id,
        name: product.name,
        strength: product.strength,
        manufacturer: product.manufacturer,
        category: product.category,
        stockLevels,
        pricing,
        lowStockAlert,
        canSell,
        lastUpdated: product.inventoryUpdatedAt?.toISOString() || new Date().toISOString()
      };
    });

    return NextResponse.json(createSuccessResponse(formattedProducts));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}