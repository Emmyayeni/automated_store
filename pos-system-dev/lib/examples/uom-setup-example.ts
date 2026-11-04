/**
 * Example setup for Paracetamol 500mg with pack/card hierarchy
 * 
 * Structure:
 * - 1 Pack = 3 Cards
 * - 1 Card = 2 Strips  
 * - 1 Strip = 10 Tablets
 * - Base unit = Tablet
 * 
 * This example shows how to configure a product with multiple UOMs
 * so customers can buy either:
 * - Individual tablets
 * - Strips (10 tablets)
 * - Cards (20 tablets)
 * - Packs (60 tablets)
 */

import { db } from "@/lib/db";
import { 
  products, 
  unitsOfMeasure, 
  productUoms, 
  productPackagingHierarchy,
  inventory,
  inventoryByUom
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { createDefaultPharmacyUOMs } from "@/lib/uom-utils";

export async function setupParacetamolExample(businessId: string, locationId: string) {
  console.log("Setting up Paracetamol 500mg with UOM hierarchy...");

  try {
    // 1. Ensure default UOMs exist
    await createDefaultPharmacyUOMs(businessId);

    // 2. Get UOM IDs
    const uomRecords = await db
      .select()
      .from(unitsOfMeasure)
      .where(eq(unitsOfMeasure.businessId, businessId));

    const tabletUOM = uomRecords.find(u => u.code === 'TAB');
    const stripUOM = uomRecords.find(u => u.code === 'STRIP');
    const cardUOM = uomRecords.find(u => u.code === 'CARD');
    const packUOM = uomRecords.find(u => u.code === 'PACK');

    if (!tabletUOM || !stripUOM || !cardUOM || !packUOM) {
      throw new Error("Required UOMs not found. Please run createDefaultPharmacyUOMs first.");
    }

    // 3. Create the product
    const [product] = await db
      .insert(products)
      .values({
        businessId,
        name: "Paracetamol 500mg",
        description: "Pain reliever and fever reducer",
        price: "0.50", // Price per tablet
        category: "prescription_medicines",
        barcode: "PAR500-001",
        sku: "PAR500",
        drugType: "otc",
        drugForm: "tablet",
        strength: "500mg",
        genericName: "Paracetamol",
        brandName: "ParaMax",
        manufacturer: "PharmaCorp",
        activeIngredient: "Paracetamol",
        dosageInstructions: "Take 1-2 tablets every 4-6 hours as needed",
        stockLevel: 0, // Will be set via inventory
        reorderLevel: 100,
      })
      .returning();

    console.log("Created product:", product.name);

    // 4. Configure product UOMs with conversion factors
    const productUOMConfigs = [
      {
        uomId: tabletUOM.id,
        conversionFactor: 1, // Base unit
        pricePerUnit: 0.50,
        isBaseUom: true,
        isSellingUom: true,
        isPurchasingUom: false,
        skuSuffix: "-TAB",
      },
      {
        uomId: stripUOM.id,
        conversionFactor: 10, // 1 strip = 10 tablets
        pricePerUnit: 4.50, // Slight discount for strip
        isBaseUom: false,
        isSellingUom: true,
        isPurchasingUom: false,
        skuSuffix: "-STRIP",
        barcode: "PAR500-STRIP-001",
      },
      {
        uomId: cardUOM.id,
        conversionFactor: 20, // 1 card = 20 tablets (2 strips)
        pricePerUnit: 8.50, // Better discount for card
        isBaseUom: false,
        isSellingUom: true,
        isPurchasingUom: true,
        skuSuffix: "-CARD",
        barcode: "PAR500-CARD-001",
      },
      {
        uomId: packUOM.id,
        conversionFactor: 60, // 1 pack = 60 tablets (3 cards)
        pricePerUnit: 24.00, // Best discount for pack
        isBaseUom: false,
        isSellingUom: true,
        isPurchasingUom: true,
        skuSuffix: "-PACK",
        barcode: "PAR500-PACK-001",
      },
    ];

    for (const config of productUOMConfigs) {
      await db.insert(productUoms).values({
        productId: product.id,
        uomId: config.uomId,
        isBaseUom: config.isBaseUom,
        isSellingUom: config.isSellingUom,
        isPurchasingUom: config.isPurchasingUom,
        conversionFactor: String(config.conversionFactor),
        pricePerUnit: config.pricePerUnit ? String(config.pricePerUnit) : null,
        skuSuffix: config.skuSuffix,
        barcode: config.barcode,
      });
    }

    console.log("Configured product UOMs");

    // 5. Set up packaging hierarchy
    const hierarchyConfigs = [
      {
        parentUomId: stripUOM.id,
        childUomId: tabletUOM.id,
        quantityPerParent: 10,
        levelOrder: 4, // Strip -> Tablet
      },
      {
        parentUomId: cardUOM.id,
        childUomId: stripUOM.id,
        quantityPerParent: 2,
        levelOrder: 3, // Card -> Strip
      },
      {
        parentUomId: packUOM.id,
        childUomId: cardUOM.id,
        quantityPerParent: 3,
        levelOrder: 2, // Pack -> Card
      },
    ];

    for (const config of hierarchyConfigs) {
      await db.insert(productPackagingHierarchy).values({
        productId: product.id,
        parentUomId: config.parentUomId,
        childUomId: config.childUomId,
        quantityPerParent: String(config.quantityPerParent),
        levelOrder: config.levelOrder,
      });
    }

    console.log("Configured packaging hierarchy");

    // 6. Set up initial inventory
    const [inventoryRecord] = await db
      .insert(inventory)
      .values({
        locationId,
        productId: product.id,
        quantity: 1000, // 1000 tablets in base inventory
        minStockLevel: 100,
        maxStockLevel: 5000,
        costPrice: "0.30",
        sellPrice: "0.50",
      })
      .returning();

    // 7. Set up UOM-specific inventory tracking
    const inventoryUOMConfigs = [
      {
        uomId: tabletUOM.id,
        quantity: 1000, // 1000 tablets
      },
      {
        uomId: stripUOM.id,
        quantity: 100, // 100 strips (equivalent to 1000 tablets)
      },
      {
        uomId: cardUOM.id,
        quantity: 50, // 50 cards (equivalent to 1000 tablets)
      },
      {
        uomId: packUOM.id,
        quantity: 16, // 16 packs (960 tablets) + some loose cards
      },
    ];

    for (const config of inventoryUOMConfigs) {
      await db.insert(inventoryByUom).values({
        inventoryId: inventoryRecord.id,
        uomId: config.uomId,
        quantity: String(config.quantity),
        reservedQuantity: "0",
      });
    }

    console.log("Set up inventory with UOM tracking");

    return {
      product,
      message: "Paracetamol 500mg configured successfully with UOM hierarchy",
      salesExamples: [
        "Customer can buy 1 tablet for $0.50",
        "Customer can buy 1 strip (10 tablets) for $4.50", 
        "Customer can buy 1 card (20 tablets) for $8.50",
        "Customer can buy 1 pack (60 tablets) for $24.00",
      ],
      inventoryNote: "System tracks inventory at all levels automatically",
    };

  } catch (error) {
    console.error("Error setting up Paracetamol example:", error);
    throw error;
  }
}

/**
 * Example usage in API route or admin panel:
 * 
 * POST /api/setup-examples/paracetamol
 * {
 *   "businessId": "business-uuid",
 *   "locationId": "location-uuid"
 * }
 */
export async function createSetupExampleAPI() {
  return `
// pages/api/setup-examples/paracetamol.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { setupParacetamolExample } from '@/lib/examples/uom-setup';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, locationId } = req.body;
    
    if (!businessId || !locationId) {
      return res.status(400).json({ error: 'businessId and locationId are required' });
    }

    const result = await setupParacetamolExample(businessId, locationId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Failed to setup example' });
  }
}
`;
}

/**
 * Real-world scenarios this handles:
 * 
 * 1. HOSPITAL PURCHASE:
 *    - Order 5 packs (300 tablets total)
 *    - Inventory automatically deducted: 300 tablets from base stock
 *    - UOM inventory updated: 5 packs, equivalent strips/cards
 * 
 * 2. INDIVIDUAL CUSTOMER:
 *    - Buy 3 tablets for headache
 *    - Inventory deducted: 3 tablets
 *    - If strip is broken, track partial strip quantities
 * 
 * 3. PHARMACY CHAIN:
 *    - Transfer 10 cards between locations
 *    - System converts: 10 cards = 200 tablets
 *    - Both locations' inventory updated correctly
 * 
 * 4. EXPIRY MANAGEMENT:
 *    - Mark 2 packs as expired
 *    - System calculates: 120 tablets expired
 *    - All UOM levels updated proportionally
 */