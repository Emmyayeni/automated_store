import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventory, products, locations } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/inventory/all
// Returns all inventory across all locations for admin view
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access this endpoint
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Insufficient permissions. Only admins can view all inventory." },
        { status: 403 }
      );
    }

    // Get business ID from session (assuming it's available)
    const businessId = session.user.businessId;
    if (!businessId) {
      return NextResponse.json({ error: "No business associated with user" }, { status: 400 });
    }

    // Join inventory with products and locations to get all data
    const result = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        productName: products.name,
        sku: products.sku,
        quantity: inventory.quantity,
        minStockLevel: inventory.minStockLevel,
        maxStockLevel: inventory.maxStockLevel,
        costPrice: inventory.costPrice,
        sellPrice: inventory.sellPrice,
        updatedAt: inventory.updatedAt,
        category: products.category,
        description: products.description,
        isActive: products.isActive,
        locationId: inventory.locationId,
        locationName: locations.name,
        locationAddress: locations.address,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .innerJoin(locations, eq(inventory.locationId, locations.id))
      .where(
        and(
          eq(products.businessId, businessId),
          eq(locations.businessId, businessId),
          eq(products.isActive, true)
        )
      )
      .orderBy(desc(inventory.updatedAt));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /admin/inventory/all:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory", details: error?.message },
      { status: 500 }
    );
  }
}