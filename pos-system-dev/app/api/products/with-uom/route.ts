import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productUoms, unitsOfMeasure, inventory, inventoryByUom } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { 
  createSuccessResponse, 
  createErrorResponse,
  createAuthErrorResponse,
  createAuthorizationErrorResponse,
  handleApiError,
  createErrorContext,
  validateRole
} from '@/lib/standards';

// GET /api/products/with-uom?businessId=...
export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const accessControl = await validateRole(['ADMIN', 'MANAGER']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error!);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(createErrorResponse(
        "Business ID is required", 
        "MISSING_BUSINESS_ID"
      ), { status: 400 });
    }

    // Get all products for the business
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        genericName: products.genericName,
        strength: products.strength,
        manufacturer: products.manufacturer,
        sku: products.sku,
        barcode: products.barcode,
        price: products.price,
        category: products.category,
        drugForm: products.drugForm,
        description: products.description,
        isActive: products.isActive,
        createdAt: products.createdAt
      })
      .from(products)
      .where(eq(products.businessId, businessId))
      .orderBy(products.name);

    // For each product, check if it has UOM setup and get stock data
    const productsWithUOM = await Promise.all(
      allProducts.map(async (product) => {
        // Check if product has UOM setup
        const uomCheck = await db
          .select({ count: sql<number>`count(*)` })
          .from(productUoms)
          .where(eq(productUoms.productId, product.id));

        const hasUomSetup = Number(uomCheck[0]?.count) > 0;

        // Get total stock across all locations
        const stockData = await db
          .select({
            totalQuantity: sql<number>`sum(${inventory.quantity})`,
          })
          .from(inventory)
          .where(eq(inventory.productId, product.id));

        const totalStock = Number(stockData[0]?.totalQuantity) || 0;

        // If has UOM setup, get UOM breakdown
        let uomStock: {
          packs: number;
          cards: number;
          strips: number;
          baseUnits: number;
        } | null = null;
        if (hasUomSetup) {
          // Get UOM breakdown - this is simplified, you might want to enhance this
          const uomBreakdown = await db
            .select({
              uomCode: unitsOfMeasure.code,
              quantity: sql<number>`sum(${inventoryByUom.quantity})`
            })
            .from(inventoryByUom)
            .innerJoin(inventory, eq(inventoryByUom.inventoryId, inventory.id))
            .innerJoin(unitsOfMeasure, eq(inventoryByUom.uomId, unitsOfMeasure.id))
            .where(eq(inventory.productId, product.id))
            .groupBy(unitsOfMeasure.code);

          // Convert to structured format
          uomStock = {
            packs: 0,
            cards: 0,
            strips: 0,
            baseUnits: 0
          };

          uomBreakdown.forEach(uom => {
            const quantity = Number(uom.quantity) || 0;
            if (uomStock) {
              switch (uom.uomCode?.toUpperCase()) {
                case 'PACK':
                  uomStock.packs = quantity;
                  break;
                case 'CARD':
                  uomStock.cards = quantity;
                  break;
                case 'STRIP':
                  uomStock.strips = quantity;
                  break;
                default:
                  uomStock.baseUnits += quantity;
                  break;
              }
            }
          });
        }

        return {
          ...product,
          hasUomSetup,
          totalStock,
          uomStock
        };
      })
    );

    return NextResponse.json(createSuccessResponse(productsWithUOM));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}