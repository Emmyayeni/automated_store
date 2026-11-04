/**
 * GET /api/reports/inventory-summary
 * Provides aggregate inventory metrics for the Reports page.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInventorySummary } from "@/server/services/inventory.service";
import { hasPermission, canAccessBranch, PERMISSIONS } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");

  if (
    !hasPermission(user.role, PERMISSIONS.VIEW_ALL_REPORTS) &&
    !hasPermission(user.role, PERMISSIONS.VIEW_BRANCH_REPORTS)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let branchId: string | undefined;
  if (hasPermission(user.role, PERMISSIONS.VIEW_ALL_REPORTS)) {
    branchId = locationId || undefined;
  } else {
    branchId = user.locationId;
  }

  if (branchId && !canAccessBranch(user.role, user.locationId, branchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const summary = await getInventorySummary(branchId);
  return NextResponse.json(summary);
}
