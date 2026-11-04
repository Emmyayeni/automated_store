import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryAdjustmentLogs, products, locations, users } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/inventory/history
// Returns adjustment history across all locations for admin view
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access this endpoint
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Insufficient permissions. Only admins can view all adjustment history." },
        { status: 403 }
      );
    }

    // Get business ID from session
    const businessId = session.user.businessId;
    if (!businessId) {
      return NextResponse.json({ error: "No business associated with user" }, { status: 400 });
    }

    // Get enriched adjustment history across all locations
    const result = await db
      .select({
        id: inventoryAdjustmentLogs.id,
        locationId: inventoryAdjustmentLogs.locationId,
        locationName: locations.name,
        productId: inventoryAdjustmentLogs.productId,
        productName: products.name,
        productSku: products.sku,
        adjustmentType: inventoryAdjustmentLogs.adjustmentType,
        previousQuantity: inventoryAdjustmentLogs.previousQuantity,
        adjustmentQuantity: inventoryAdjustmentLogs.adjustmentQuantity,
        newQuantity: inventoryAdjustmentLogs.newQuantity,
        reason: inventoryAdjustmentLogs.reason,
        adjustedBy: inventoryAdjustmentLogs.adjustedBy,
        adjustedByName: users.name,
        referenceId: inventoryAdjustmentLogs.referenceId,
        referenceType: inventoryAdjustmentLogs.referenceType,
        notes: inventoryAdjustmentLogs.notes,
        createdAt: inventoryAdjustmentLogs.createdAt,
      })
      .from(inventoryAdjustmentLogs)
      .innerJoin(products, eq(inventoryAdjustmentLogs.productId, products.id))
      .innerJoin(locations, eq(inventoryAdjustmentLogs.locationId, locations.id))
      .innerJoin(users, eq(inventoryAdjustmentLogs.adjustedBy, users.id))
      .where(
        and(
          eq(products.businessId, businessId),
          eq(locations.businessId, businessId)
        )
      )
      .orderBy(desc(inventoryAdjustmentLogs.createdAt))
      .limit(200); // Limit to last 200 records for performance

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /admin/inventory/history:", error);
    return NextResponse.json(
      { error: "Failed to fetch adjustment history", details: error?.message },
      { status: 500 }
    );
  }
}