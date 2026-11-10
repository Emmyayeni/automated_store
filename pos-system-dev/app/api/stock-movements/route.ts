/**
 * GET /api/stock-movements
 * Returns recent stock movements, filterable by type, branch, product.
 * Used by the Stock-In and Stock-Out pages to show recent records.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stockMovements, products, locations } from "@/lib/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { canAccessBranch } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // STOCK_IN, STOCK_OUT, etc.
  const locationId = searchParams.get("locationId");
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

  // Build conditions
  const conditions = [];

  if (type) {
    conditions.push(sql`${stockMovements.movementType} = ${type}`);
  }

  // Branch-scope: non-admins only see their own branch
  const branchId = locationId || (user.role !== "ADMIN" ? user.locationId : null);
  if (branchId) {
    if (!canAccessBranch(user.role, user.locationId, branchId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    conditions.push(eq(stockMovements.locationId, branchId));
  }

  const rows = await db
    .select({
      id: stockMovements.id,
      movementType: stockMovements.movementType,
      quantity: stockMovements.quantity,
      balanceBefore: stockMovements.balanceBefore,
      balanceAfter: stockMovements.balanceAfter,
      reason: stockMovements.reason,
      reference: stockMovements.reference,
      notes: stockMovements.notes,
      createdAt: stockMovements.createdAt,
      productName: products.name,
      productSku: products.sku,
      locationName: locations.name,
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(locations, eq(stockMovements.locationId, locations.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit);

  // Map to the shape the UI pages expect
  const result = rows.map((r) => ({
    id: r.id,
    productName: r.productName,
    productSku: r.productSku,
    quantity: r.quantity,
    balanceAfter: r.balanceAfter,
    balanceBefore: r.balanceBefore,
    reason: r.reason,
    reference: r.reference,
    notes: r.notes,
    createdAt: r.createdAt,
    locationName: r.locationName,
    movementType: r.movementType,
  }));

  return NextResponse.json(result);
}
