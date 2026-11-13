import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  inventoryTransfers,
  inventoryTransferItems,
  locations,
  users,
  products,
} from "@/lib/schema";
import { eq, or, desc, and } from "drizzle-orm";
import { adjustInventoryWithLog } from "@/lib/inventory-utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST: Create new inventory transfer request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fromLocationId, toLocationId, items, notes } = await request.json();

    if (!fromLocationId || !toLocationId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: fromLocationId, toLocationId, and items" },
        { status: 400 }
      );
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        { error: "Cannot transfer to the same location" },
        { status: 400 }
      );
    }

    const transferNumber = `TR-${Date.now()}`;

    // Create transfer
    const [transfer] = await db
      .insert(inventoryTransfers)
      .values({
        transferNumber,
        fromLocationId,
        toLocationId,
        requestedBy: session.user.id,
        notes: notes || null,
      })
      .returning();

    const transferId = transfer.id;

    // Create transfer items
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Each item must have a valid productId and positive quantity" },
          { status: 400 }
        );
      }

      await db.insert(inventoryTransferItems).values({
        transferId,
        productId: item.productId,
        quantityRequested: item.quantity,
        notes: item.notes || null,
      });
    }

    return NextResponse.json({
      transfer,
      message: "Transfer request created successfully",
    });
  } catch (error) {
    console.error("Error creating inventory transfer:", error);
    return NextResponse.json(
      { error: "Failed to create inventory transfer" },
      { status: 500 }
    );
  }
}

// GET: Fetch inventory transfers with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");
    const includeItems = searchParams.get("includeItems") === "true";

    let whereClauses: any[] = [];

    if (locationId) {
      whereClauses.push(
        or(
          eq(inventoryTransfers.fromLocationId, locationId),
          eq(inventoryTransfers.toLocationId, locationId)
        )
      );
    }

    if (status) {
      const validStatuses = ["REQUESTED", "APPROVED", "REJECTED", "IN_TRANSIT", "RECEIVED", "CANCELLED"];
      if (validStatuses.includes(status)) {
        whereClauses.push(eq(inventoryTransfers.status, status as any));
      }
    }

    const transfers = await db
      .select({
        id: inventoryTransfers.id,
        transferNumber: inventoryTransfers.transferNumber,
        fromLocationId: inventoryTransfers.fromLocationId,
        fromLocationName: locations.name,
        toLocationId: inventoryTransfers.toLocationId,
        requestedBy: inventoryTransfers.requestedBy,
        approvedBy: inventoryTransfers.approvedBy,
        status: inventoryTransfers.status,
        requestedDate: inventoryTransfers.requestedDate,
        approvedDate: inventoryTransfers.approvedDate,
        dispatchedDate: inventoryTransfers.dispatchedDate,
        receivedDate: inventoryTransfers.receivedDate,
        notes: inventoryTransfers.notes,
        requestedByName: users.name,
      })
      .from(inventoryTransfers)
      .innerJoin(locations, eq(inventoryTransfers.fromLocationId, locations.id))
      .innerJoin(users, eq(inventoryTransfers.requestedBy, users.id))
      .where(whereClauses.length ? and(...whereClauses) : undefined)
      .orderBy(desc(inventoryTransfers.requestedDate));

    // Get to location names
    const transfersWithToLocation = await Promise.all(
      transfers.map(async (transfer) => {
        const [toLocation] = await db
          .select({ name: locations.name })
          .from(locations)
          .where(eq(locations.id, transfer.toLocationId));

        let transferItems: any[] = [];
        if (includeItems) {
          transferItems = await db
            .select({
              id: inventoryTransferItems.id,
              productId: inventoryTransferItems.productId,
              productName: products.name,
              productSku: products.sku,
              quantityRequested: inventoryTransferItems.quantityRequested,
              quantityDispatched: inventoryTransferItems.quantityDispatched,
              quantityReceived: inventoryTransferItems.quantityReceived,
              notes: inventoryTransferItems.notes,
            })
            .from(inventoryTransferItems)
            .innerJoin(products, eq(inventoryTransferItems.productId, products.id))
            .where(eq(inventoryTransferItems.transferId, transfer.id));
        }

        return {
          ...transfer,
          toLocationName: toLocation?.name || 'Unknown Location',
          items: transferItems,
        };
      })
    );

    return NextResponse.json(transfersWithToLocation);
  } catch (error) {
    console.error("Error fetching inventory transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory transfers" },
      { status: 500 }
    );
  }
}

// PUT: Update transfer status (approve, ship, receive, etc.)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transferId, action, items, notes } = await request.json();

    if (!transferId || !action) {
      return NextResponse.json(
        { error: "Transfer ID and action are required" },
        { status: 400 }
      );
    }

    // Get transfer details
    const [transfer] = await db
      .select()
      .from(inventoryTransfers)
      .where(eq(inventoryTransfers.id, transferId));

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    let updateData: any = {};
    let statusMessage = "";

    switch (action) {
      case "approve":
        if (transfer.status !== "REQUESTED") {
          return NextResponse.json(
            { error: "Only pending transfers can be approved" },
            { status: 400 }
          );
        }
        updateData = {
          status: "APPROVED",
          approvedBy: session.user.id,
          approvedDate: new Date(),
        };
        statusMessage = "Transfer approved successfully";
        break;

      case "reject":
        if (transfer.status !== "REQUESTED") {
          return NextResponse.json(
            { error: "Only pending transfers can be rejected" },
            { status: 400 }
          );
        }
        updateData = {
          status: "REJECTED",
          approvedBy: session.user.id,
          approvedDate: new Date(),
        };
        statusMessage = "Transfer rejected";
        break;

      case "ship":
        if (transfer.status !== "APPROVED") {
          return NextResponse.json(
            { error: "Only approved transfers can be shipped" },
            { status: 400 }
          );
        }

        // Update shipped quantities and adjust source location inventory
        if (items && Array.isArray(items)) {
          for (const item of items) {
            await db
              .update(inventoryTransferItems)
              .set({ quantityDispatched: item.quantityDispatched })
              .where(
                and(
                  eq(inventoryTransferItems.transferId, transferId),
                  eq(inventoryTransferItems.productId, item.productId)
                )
              );

            // Adjust inventory at source location
            await adjustInventoryWithLog({
              locationId: transfer.fromLocationId,
              productId: item.productId,
              adjustmentType: 'transfer_out',
              adjustmentQuantity: -item.quantityDispatched,
              reason: `Transfer out to location - ${transfer.transferNumber}`,
              adjustedBy: session.user.id,
              referenceId: transferId,
              referenceType: 'transfer_out',
              notes: `Shipped ${item.quantityDispatched} units`,
            });
          }
        }

        updateData = {
          status: "IN_TRANSIT",
          dispatchedDate: new Date(),
        };
        statusMessage = "Transfer shipped and inventory adjusted";
        break;

      case "receive":
        if (transfer.status !== "IN_TRANSIT") {
          return NextResponse.json(
            { error: "Only shipped transfers can be received" },
            { status: 400 }
          );
        }

        // Update received quantities and adjust destination location inventory
        if (items && Array.isArray(items)) {
          for (const item of items) {
            await db
              .update(inventoryTransferItems)
              .set({ quantityReceived: item.quantityReceived })
              .where(
                and(
                  eq(inventoryTransferItems.transferId, transferId),
                  eq(inventoryTransferItems.productId, item.productId)
                )
              );

            // Adjust inventory at destination location
            await adjustInventoryWithLog({
              locationId: transfer.toLocationId,
              productId: item.productId,
              adjustmentType: 'transfer_in',
              adjustmentQuantity: item.quantityReceived,
              reason: `Transfer in from location - ${transfer.transferNumber}`,
              adjustedBy: session.user.id,
              referenceId: transferId,
              referenceType: 'transfer_in',
              notes: `Received ${item.quantityReceived} units`,
            });
          }
        }

        updateData = {
          status: "RECEIVED",
          receivedDate: new Date(),
        };
        statusMessage = "Transfer received and inventory adjusted";
        break;

      case "cancel":
        if (!["REQUESTED", "APPROVED"].includes(transfer.status || "")) {
          return NextResponse.json(
            { error: "Only pending or approved transfers can be cancelled" },
            { status: 400 }
          );
        }
        updateData = {
          status: "CANCELLED",
        };
        statusMessage = "Transfer cancelled";
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (notes) {
      updateData.notes = notes;
    }

    // Update transfer
    const [updatedTransfer] = await db
      .update(inventoryTransfers)
      .set(updateData)
      .where(eq(inventoryTransfers.id, transferId))
      .returning();

    return NextResponse.json({
      transfer: updatedTransfer,
      message: statusMessage,
    });
  } catch (error) {
    console.error("Error updating inventory transfer:", error);
    return NextResponse.json(
      { error: "Failed to update inventory transfer" },
      { status: 500 }
    );
  }
}