import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { pharmacyInventory, inventory, products } from "@/lib/schema";
import { eq, and, lt, gte, desc, sql } from "drizzle-orm";

// GET - Get batch tracking information
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const locationId = url.searchParams.get('locationId');
    const batchNumber = url.searchParams.get('batchNumber');
    const expiringDays = Number.parseInt(url.searchParams.get('expiringDays') || '30');
    const includeExpired = url.searchParams.get('includeExpired') === 'true';

    let conditions = [];

    if (productId) {
      conditions.push(eq(inventory.productId, productId));
    }

    if (locationId) {
      conditions.push(eq(inventory.locationId, locationId));
    }

    if (batchNumber) {
      conditions.push(eq(pharmacyInventory.batchNumber, batchNumber));
    }

    // Filter by expiry dates
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + expiringDays * 24 * 60 * 60 * 1000);

    if (!includeExpired) {
      conditions.push(gte(pharmacyInventory.expiryDate, now));
    }

    const batches = await db
      .select({
        batchId: pharmacyInventory.id,
        inventoryId: pharmacyInventory.inventoryId,
        productId: inventory.productId,
        productName: products.name,
        productSku: products.sku,
        locationId: inventory.locationId,
        batchNumber: pharmacyInventory.batchNumber,
        expiryDate: pharmacyInventory.expiryDate,
        manufacturingDate: pharmacyInventory.manufacturingDate,
        supplierBatchNumber: pharmacyInventory.supplierBatchNumber,
        quantity: pharmacyInventory.quantity,
        costPrice: pharmacyInventory.costPrice,
        sellPrice: pharmacyInventory.sellPrice,
        isQuarantined: pharmacyInventory.isQuarantined,
        quarantineReason: pharmacyInventory.quarantineReason,
        daysUntilExpiry: sql`DATE_PART('day', ${pharmacyInventory.expiryDate} - CURRENT_DATE)`,
        isExpiring: sql`${pharmacyInventory.expiryDate} <= ${expiryThreshold}`,
        isExpired: sql`${pharmacyInventory.expiryDate} < CURRENT_DATE`,
        createdAt: pharmacyInventory.createdAt,
        updatedAt: pharmacyInventory.updatedAt,
      })
      .from(pharmacyInventory)
      .innerJoin(inventory, eq(pharmacyInventory.inventoryId, inventory.id))
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(pharmacyInventory.expiryDate);

    // Categorize batches
    const categorizedBatches = {
      expired: batches.filter(b => b.isExpired),
      expiring: batches.filter(b => b.isExpiring && !b.isExpired),
      good: batches.filter(b => !b.isExpiring && !b.isExpired),
      quarantined: batches.filter(b => b.isQuarantined)
    };

    // Calculate summary statistics
    const summary = {
      totalBatches: batches.length,
      totalQuantity: batches.reduce((sum, b) => sum + Number(b.quantity), 0),
      totalValue: batches.reduce((sum, b) => sum + Number(b.quantity) * Number(b.costPrice || 0), 0),
      expired: categorizedBatches.expired.length,
      expiring: categorizedBatches.expiring.length,
      quarantined: categorizedBatches.quarantined.length,
      expiringValue: categorizedBatches.expiring.reduce((sum, b) => 
        sum + Number(b.quantity) * Number(b.costPrice || 0), 0
      ),
      expiredValue: categorizedBatches.expired.reduce((sum, b) => 
        sum + Number(b.quantity) * Number(b.costPrice || 0), 0
      )
    };

    return NextResponse.json({
      batches,
      categorized: categorizedBatches,
      summary,
      filters: {
        productId,
        locationId,
        batchNumber,
        expiringDays,
        includeExpired
      }
    });

  } catch (error) {
    console.error("Batch tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new batch
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      inventoryId,
      batchNumber,
      expiryDate,
      manufacturingDate,
      supplierBatchNumber,
      quantity,
      costPrice,
      sellPrice
    } = await request.json();

    if (!inventoryId || !batchNumber || !expiryDate || !quantity) {
      return NextResponse.json({ 
        error: "inventoryId, batchNumber, expiryDate, and quantity are required" 
      }, { status: 400 });
    }

    // Verify expiry date is in the future
    if (new Date(expiryDate) <= new Date()) {
      return NextResponse.json({ 
        error: "Expiry date must be in the future" 
      }, { status: 400 });
    }

    // Check if batch number already exists for this inventory
    const existingBatch = await db
      .select({ id: pharmacyInventory.id })
      .from(pharmacyInventory)
      .where(and(
        eq(pharmacyInventory.inventoryId, inventoryId),
        eq(pharmacyInventory.batchNumber, batchNumber)
      ))
      .limit(1);

    if (existingBatch.length > 0) {
      return NextResponse.json({ 
        error: "Batch number already exists for this product" 
      }, { status: 409 });
    }

    const [newBatch] = await db
      .insert(pharmacyInventory)
      .values({
        inventoryId,
        batchNumber,
        expiryDate: new Date(expiryDate),
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
        supplierBatchNumber,
        quantity: Number(quantity),
        costPrice: costPrice ? costPrice.toString() : null,
        sellPrice: sellPrice ? sellPrice.toString() : null,
        isQuarantined: false
      })
      .returning();

    // Update main inventory quantity
    await db
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} + ${quantity}`,
        updatedAt: new Date()
      })
      .where(eq(inventory.id, inventoryId));

    return NextResponse.json({
      message: "Batch created successfully",
      batch: newBatch
    });

  } catch (error) {
    console.error("Create batch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update batch (e.g., quarantine, adjust quantity)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      batchId,
      quantity,
      isQuarantined,
      quarantineReason,
      adjustmentReason
    } = await request.json();

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    // Get current batch
    const [currentBatch] = await db
      .select()
      .from(pharmacyInventory)
      .where(eq(pharmacyInventory.id, batchId))
      .limit(1);

    if (!currentBatch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const updates: any = {};

    // Handle quantity adjustment
    if (quantity !== undefined) {
      const quantityDiff = Number(quantity) - Number(currentBatch.quantity);
      updates.quantity = Number(quantity);

      // Update main inventory
      await db
        .update(inventory)
        .set({
          quantity: sql`${inventory.quantity} + ${quantityDiff}`,
          updatedAt: new Date()
        })
        .where(eq(inventory.id, currentBatch.inventoryId));
    }

    // Handle quarantine
    if (isQuarantined !== undefined) {
      updates.isQuarantined = isQuarantined;
      if (isQuarantined && quarantineReason) {
        updates.quarantineReason = quarantineReason;
      } else if (!isQuarantined) {
        updates.quarantineReason = null;
      }
    }

    updates.updatedAt = new Date();

    const [updatedBatch] = await db
      .update(pharmacyInventory)
      .set(updates)
      .where(eq(pharmacyInventory.id, batchId))
      .returning();

    return NextResponse.json({
      message: "Batch updated successfully",
      batch: updatedBatch
    });

  } catch (error) {
    console.error("Update batch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove batch (with inventory adjustment)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const batchId = url.searchParams.get('batchId');
    const reason = url.searchParams.get('reason') || 'Batch removal';

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    // Get batch before deletion
    const [batch] = await db
      .select()
      .from(pharmacyInventory)
      .where(eq(pharmacyInventory.id, batchId))
      .limit(1);

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Update main inventory (subtract batch quantity)
    await db
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} - ${batch.quantity}`,
        updatedAt: new Date()
      })
      .where(eq(inventory.id, batch.inventoryId));

    // Delete batch
    await db
      .delete(pharmacyInventory)
      .where(eq(pharmacyInventory.id, batchId));

    return NextResponse.json({
      message: "Batch removed successfully",
      removedQuantity: batch.quantity,
      reason
    });

  } catch (error) {
    console.error("Delete batch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
