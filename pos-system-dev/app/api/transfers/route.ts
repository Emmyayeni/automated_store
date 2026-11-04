/**
 * GET  /api/transfers  — List transfers (filtered by status, branch)
 * POST /api/transfers  — Create a new transfer request
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getTransfers, createTransfer } from "@/server/services/transfer.service";
import { hasPermission, canAccessBranch, PERMISSIONS } from "@/lib/roles";

// ---- GET: list transfers ----
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const locationId = searchParams.get("locationId") || undefined;

  // Non-admins are branch-scoped
  const filters: { status?: string; locationId?: string } = { status };
  if (user.role !== "ADMIN") {
    filters.locationId = user.locationId;
  } else if (locationId) {
    filters.locationId = locationId;
  }

  const data = await getTransfers(filters);
  return NextResponse.json(data);
}

// ---- POST: create transfer ----
const createSchema = z.object({
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.coerce.number().int().positive(),
    })
  ).min(1, "At least one item is required"),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if (!hasPermission(user.role, PERMISSIONS.REQUEST_TRANSFER)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { fromLocationId, toLocationId, items, notes } = parsed.data;

  // Non-admins can only transfer FROM their own branch
  if (!canAccessBranch(user.role, user.locationId, fromLocationId)) {
    return NextResponse.json(
      { success: false, error: "You can only request transfers from your own branch." },
      { status: 403 }
    );
  }

  const result = await createTransfer({
    userId: user.id,
    fromLocationId,
    toLocationId,
    items,
    notes,
  });

  return NextResponse.json(result, { status: result.success ? 201 : 400 });
}
