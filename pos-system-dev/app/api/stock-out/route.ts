/**
 * POST /api/stock-out
 * Records goods leaving a branch inventory.
 * System rejects if stock would go negative (BR-06).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { recordStockOut } from "@/server/services/inventory.service";
import { hasPermission, canAccessBranch, PERMISSIONS } from "@/lib/roles";

const schema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: z.enum(["SALE", "DAMAGED", "EXPIRED", "INTERNAL_USE", "ADJUSTMENT", "OTHER"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if (!hasPermission(user.role, PERMISSIONS.RECORD_STOCK_OUT)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { locationId, productId, quantity, reason, reference, notes } = parsed.data;

  if (!canAccessBranch(user.role, user.locationId, locationId)) {
    return NextResponse.json({ success: false, error: "Forbidden: not authorized for this branch" }, { status: 403 });
  }

  const result = await recordStockOut({ userId: user.id, locationId, productId, quantity, reason, reference, notes });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
