/**
 * POST /api/stock-in
 * Records goods received at a branch.
 * Validates permissions server-side before calling inventory service.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { recordStockIn } from "@/server/services/inventory.service";
import { hasPermission, canAccessBranch, PERMISSIONS } from "@/lib/roles";

const schema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  locationId: z.string().uuid("Invalid branch ID"),
  quantity: z.number().int().positive("Quantity must be positive"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  // Server-side permission check (BR-07, never trust client)
  if (!hasPermission(user.role, PERMISSIONS.RECORD_STOCK_IN)) {
    return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { locationId, productId, quantity, reference, notes } = parsed.data;

  // Branch-level authorization (BR-07)
  if (!canAccessBranch(user.role, user.locationId, locationId)) {
    return NextResponse.json({ success: false, error: "Forbidden: not authorized for this branch" }, { status: 403 });
  }

  const result = await recordStockIn({ userId: user.id, locationId, productId, quantity, reference, notes });

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
