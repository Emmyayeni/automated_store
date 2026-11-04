import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryTransfers, inventoryTransferItems, locations, products, users } from "@/lib/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/inventory/transfers
// Returns transfer history across all locations for admin view
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access this endpoint
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Insufficient permissions. Only admins can view transfer history." },
        { status: 403 }
      );
    }

    // Get business ID from session
    const businessId = session.user.businessId;
    if (!businessId) {
      return NextResponse.json({ error: "No business associated with user" }, { status: 400 });
    }

    // First, get all locations for this business
    const businessLocations = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.businessId, businessId));

    const locationIds = businessLocations.map(l => l.id);

    if (locationIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get transfers for this business
    const transfers = await db
      .select()
      .from(inventoryTransfers)
      .where(
        and(
          inArray(inventoryTransfers.fromLocationId, locationIds),
          inArray(inventoryTransfers.toLocationId, locationIds)
        )
      )
      .orderBy(desc(inventoryTransfers.createdAt))
      .limit(100);

    if (transfers.length === 0) {
      return NextResponse.json([]);
    }

    // Get location details
    const locationDetails = await db
      .select({
        id: locations.id,
        name: locations.name,
      })
      .from(locations)
      .where(inArray(locations.id, locationIds));

    const locationMap = locationDetails.reduce((acc, loc) => {
      acc[loc.id] = loc;
      return acc;
    }, {} as Record<string, { id: string; name: string }>);

    // Get user details
    const userIds = [...new Set([
      ...transfers.map(t => t.requestedBy),
      ...transfers.map(t => t.approvedBy).filter(Boolean)
    ])] as string[];

    const userDetails = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    const userMap = userDetails.reduce((acc, user) => {
      acc[user.id] = { ...user, name: user.name || 'Unknown User' };
      return acc;
    }, {} as Record<string, { id: string; name: string }>);

    // Get transfer items
    const transferIds = transfers.map(t => t.id);
    const transferItemsWithProducts = await db
      .select({
        id: inventoryTransferItems.id,
        transferId: inventoryTransferItems.transferId,
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
      .where(
        and(
          inArray(inventoryTransferItems.transferId, transferIds),
          eq(products.businessId, businessId)
        )
      );

    // Group items by transfer ID
    const itemsByTransfer = transferItemsWithProducts.reduce((acc, item) => {
      if (!acc[item.transferId]) {
        acc[item.transferId] = [];
      }
      acc[item.transferId].push(item);
      return acc;
    }, {} as Record<string, typeof transferItemsWithProducts>);

    // Combine all data
    const result = transfers.map(transfer => ({
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      fromLocationId: transfer.fromLocationId,
      toLocationId: transfer.toLocationId,
      fromLocationName: locationMap[transfer.fromLocationId]?.name || 'Unknown',
      toLocationName: locationMap[transfer.toLocationId]?.name || 'Unknown',
      requestedBy: transfer.requestedBy,
      requestedByName: userMap[transfer.requestedBy]?.name || 'Unknown',
      approvedBy: transfer.approvedBy,
      approvedByName: transfer.approvedBy ? userMap[transfer.approvedBy]?.name || 'Unknown' : null,
      status: transfer.status,
      notes: transfer.notes,
      requestedDate: transfer.requestedDate,
      approvedDate: transfer.approvedDate,
      dispatchedDate: transfer.dispatchedDate,
      receivedDate: transfer.receivedDate,
      createdAt: transfer.createdAt,
      items: itemsByTransfer[transfer.id] || []
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /admin/inventory/transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer history", details: error?.message },
      { status: 500 }
    );
  }
}