/**
 * GET  /api/inventory        — All or branch inventory with summary & branch metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllBranchesInventory, getBranchInventory, getInventorySummary } from "@/server/services/inventory.service";
import { hasPermission, canAccessBranch, PERMISSIONS } from "@/lib/roles";
import { db } from "@/lib/db";
import { locations } from "@/lib/schema";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");

  if (!hasPermission(user.role, PERMISSIONS.VIEW_BRANCH_INVENTORY)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const branchList = await db.select({ id: locations.id, name: locations.name }).from(locations);

  let items: any[] = [];
  let summaryLocationId: string | undefined = undefined;

  if (hasPermission(user.role, PERMISSIONS.VIEW_ALL_INVENTORY)) {
    if (locationId) {
      items = await getBranchInventory(locationId);
      summaryLocationId = locationId;
    } else {
      items = await getAllBranchesInventory();
    }
  } else {
    const branchId = locationId || user.locationId;
    if (!branchId || !canAccessBranch(user.role, user.locationId, branchId)) {
      return NextResponse.json({ error: "Forbidden: not authorized for this branch" }, { status: 403 });
    }
    items = await getBranchInventory(branchId);
    summaryLocationId = branchId;
  }

  const summary = await getInventorySummary(summaryLocationId);

  return NextResponse.json({
    items,
    summary,
    branches: branchList,
  });
}