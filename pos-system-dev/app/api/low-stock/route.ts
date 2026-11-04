/**
 * GET /api/low-stock
 * Returns all LOW_STOCK and OUT_OF_STOCK items.
 * Refreshes stock statuses before returning.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLowStockItems } from "@/server/services/inventory.service";
import { canAccessBranch } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");

  // Admin sees all; others see their branch
  let branchId: string | undefined;
  if (user.role === "ADMIN") {
    branchId = locationId || undefined;
  } else {
    branchId = user.locationId;
  }

  if (branchId && !canAccessBranch(user.role, user.locationId, branchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await getLowStockItems(branchId);
  return NextResponse.json(items);
}
