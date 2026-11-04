import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventory, inventoryTransfers, inventoryTransferItems } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { adjustInventoryWithLog } from "@/lib/inventory-utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/admin/inventory/transfer
// Transfer inventory between locations for admin
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can perform transfers
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Insufficient permissions. Only admins can transfer inventory between stores." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      fromLocationId, 
      toLocationId, 
      productId, 
      quantity, 
      reason, 
      notes 
    } = body;

    // Validate input
    if (!fromLocationId || !toLocationId || !productId || !quantity || quantity <= 0 || !reason?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: fromLocationId, toLocationId, productId, quantity, and reason are required" },
        { status: 400 }
      );
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        { error: "Source and destination locations must be different" },
        { status: 400 }
      );
    }

    // Check if source inventory exists and has enough quantity
    const [sourceInventory] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.locationId, fromLocationId),
          eq(inventory.productId, productId)
        )
      );

    if (!sourceInventory) {
      return NextResponse.json(
        { error: "Product not found in source location" },
        { status: 404 }
      );
    }

    if (sourceInventory.quantity < quantity) {
      return NextResponse.json(
        { error: `Insufficient quantity. Available: ${sourceInventory.quantity}, Requested: ${quantity}` },
        { status: 400 }
      );
    }

    // Check if destination inventory exists, create if not
    let [destinationInventory] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.locationId, toLocationId),
          eq(inventory.productId, productId)
        )
      );

    if (!destinationInventory) {
      // Create destination inventory record
      const [newDestInventory] = await db
        .insert(inventory)
        .values({
          locationId: toLocationId,
          productId: productId,
          quantity: 0,
          minStockLevel: sourceInventory.minStockLevel,
          maxStockLevel: sourceInventory.maxStockLevel,
          costPrice: sourceInventory.costPrice,
          sellPrice: sourceInventory.sellPrice,
        })
        .returning();
      
      destinationInventory = newDestInventory;
    }

    // Generate transfer number
    const transferNumber = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create transfer record
    const [transfer] = await db
      .insert(inventoryTransfers)
      .values({
        transferNumber,
        fromLocationId,
        toLocationId,
        requestedBy: session.user.id,
        approvedBy: session.user.id, // Admin auto-approves
        status: 'RECEIVED', // Admin transfers are immediately completed
        notes: notes?.trim() || undefined,
        requestedDate: new Date(),
        approvedDate: new Date(),
        dispatchedDate: new Date(),
        receivedDate: new Date(),
      })
      .returning();

    // Create transfer item record
    await db
      .insert(inventoryTransferItems)
      .values({
        transferId: transfer.id,
        productId,
        quantityRequested: quantity,
        quantityDispatched: quantity,
        quantityReceived: quantity,
        notes: notes?.trim() || undefined,
      });

    // Perform the inventory adjustments with logging
    // 1. Reduce from source location
    await adjustInventoryWithLog({
      locationId: fromLocationId,
      productId,
      adjustmentType: 'transfer_out',
      adjustmentQuantity: -quantity,
      reason: `Transfer to another store: ${reason}`,
      adjustedBy: session.user.id,
      referenceId: transfer.id,
      referenceType: 'transfer',
      notes: `Transfer #${transferNumber} - ${notes || ''}`.trim(),
    });

    // 2. Add to destination location
    await adjustInventoryWithLog({
      locationId: toLocationId,
      productId,
      adjustmentType: 'transfer_in',
      adjustmentQuantity: quantity,
      reason: `Transfer from another store: ${reason}`,
      adjustedBy: session.user.id,
      referenceId: transfer.id,
      referenceType: 'transfer',
      notes: `Transfer #${transferNumber} - ${notes || ''}`.trim(),
    });

    return NextResponse.json({
      transfer,
      transferNumber,
      message: `Successfully transferred ${quantity} units between stores. Transfer #${transferNumber}`,
    });

  } catch (error: any) {
    console.error("Error in POST /admin/inventory/transfer:", error);
    return NextResponse.json(
      { error: "Failed to transfer inventory", details: error?.message },
      { status: 500 }
    );
  }
}