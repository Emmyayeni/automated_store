import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, unitsOfMeasure, productUoms, inventory, inventoryByUom } from "@/lib/schema";
import { createDefaultPharmacyUOMs } from "@/lib/uom-utils";
import { eq } from "drizzle-orm";

// POST /api/products/simple-create
// Simplified product creation with auto UOM setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      genericName,
      strength,
      manufacturer,
      category,
      drugForm,
      price,
      uomStructure,
      initialStock,
      locationId,
    } = body;

    // Get business ID (you might need to get this from session)
    const businessId = "demo-business-id"; // Replace with actual business ID from session

    // Ensure default UOMs exist
    await createDefaultPharmacyUOMs(businessId);

    // Get UOM IDs
    const uomRecords = await db
      .select()
      .from(unitsOfMeasure)
      .where(eq(unitsOfMeasure.businessId, businessId));

    const uomMap = uomRecords.reduce((acc, uom) => {
      acc[uom.code] = uom.id;
      return acc;
    }, {} as Record<string, string>);

    // Create the product
    const [product] = await db
      .insert(products)
      .values({
        businessId,
        name: `${name} ${strength}`,
        genericName,
        strength,
        manufacturer,
        category,
        drugForm,
        price: uomStructure.levels[0].price.toString(),
        sku: `${name.substring(0, 3).toUpperCase()}${strength}`,
        barcode: `${name.substring(0, 3).toUpperCase()}${strength}-001`,
        stockLevel: initialStock.totalBaseUnits,
        reorderLevel: 100,
        isActive: true,
      })
      .returning();

    // Create product UOMs based on structure
    const uomMappings = [
      { code: drugForm === 'tablet' ? 'TAB' : drugForm === 'capsule' ? 'CAP' : 'ML', level: 0 },
      { code: 'STRIP', level: 1 },
      { code: 'CARD', level: 2 },
      { code: 'PACK', level: 3 },
    ];

    for (const mapping of uomMappings) {
      const uomId = uomMap[mapping.code];
      const levelData = uomStructure.levels[mapping.level];
      
      if (uomId && levelData) {
        await db.insert(productUoms).values({
          productId: product.id,
          uomId,
          isBaseUom: mapping.level === 0,
          isSellingUom: true,
          isPurchasingUom: mapping.level >= 2, // Cards and packs can be purchased
          conversionFactor: levelData.factor.toString(),
          pricePerUnit: levelData.price.toString(),
          skuSuffix: mapping.level === 0 ? '' : `-${mapping.code}`,
          barcode: mapping.level === 0 ? null : `${product.sku}-${mapping.code}-001`,
        });
      }
    }

    // Create inventory record
    const [inventoryRecord] = await db
      .insert(inventory)
      .values({
        locationId,
        productId: product.id,
        quantity: initialStock.totalBaseUnits,
        minStockLevel: 100,
        maxStockLevel: 5000,
        costPrice: (uomStructure.levels[0].price * 0.7).toString(), // 30% markup
        sellPrice: uomStructure.levels[0].price.toString(),
      })
      .returning();

    // Create UOM-specific inventory tracking
    for (const mapping of uomMappings) {
      const uomId = uomMap[mapping.code];
      const levelData = uomStructure.levels[mapping.level];
      
      if (uomId && levelData) {
        let quantity = 0;
        
        switch (mapping.level) {
          case 0: // Base units
            quantity = initialStock.totalBaseUnits;
            break;
          case 1: // Strips
            quantity = Math.floor(initialStock.totalBaseUnits / levelData.factor);
            break;
          case 2: // Cards
            quantity = Math.floor(initialStock.totalBaseUnits / levelData.factor);
            break;
          case 3: // Packs
            quantity = initialStock.packs;
            break;
        }

        await db.insert(inventoryByUom).values({
          inventoryId: inventoryRecord.id,
          uomId,
          quantity: quantity.toString(),
          reservedQuantity: "0",
        });
      }
    }

    return NextResponse.json({
      success: true,
      product,
      message: `${product.name} created successfully with UOM structure`,
      structure: {
        totalBaseUnits: initialStock.totalBaseUnits,
        packs: initialStock.packs,
        uomLevels: uomStructure.levels.length,
      }
    });

  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}