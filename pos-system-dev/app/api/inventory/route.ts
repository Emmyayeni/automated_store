/**
 * GET  /api/inventory        — All or branch inventory
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllBranchesInventory, getBranchInventory } from "@/server/services/inventory.service";
import { hasPermission, canAccessBranch, PERMISSIONS } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");

  if (!hasPermission(user.role, PERMISSIONS.VIEW_BRANCH_INVENTORY)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (hasPermission(user.role, PERMISSIONS.VIEW_ALL_INVENTORY)) {
    const data = locationId
      ? await getBranchInventory(locationId)
      : await getAllBranchesInventory();
    return NextResponse.json(data);
  }

  const branchId = locationId || user.locationId;
  if (!branchId || !canAccessBranch(user.role, user.locationId, branchId)) {
    return NextResponse.json({ error: "Forbidden: not authorized for this branch" }, { status: 403 });
  }

  const data = await getBranchInventory(branchId);
  return NextResponse.json(data);
}