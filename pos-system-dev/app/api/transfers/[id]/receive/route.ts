/**
 * POST /api/transfers/:id/receive
 * Receives an IN_TRANSIT transfer — adds stock to destination branch (BR-11).
 * Tracks discrepancies between dispatched and received quantities.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { receiveTransfer } from "@/server/services/transfer.service";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

const schema = z.object({
  items: z.array(
    z.object({
      transferItemId: z.string().uuid(),
      productId: z.string().uuid(),
      quantityReceived: z.number().int().min(0),
      discrepancyReason: z.string().optional(),
    })
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!hasPermission(user.role, PERMISSIONS.RECEIVE_TRANSFER)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { id } = await params;
  const result = await receiveTransfer(user.id, id, parsed.data.items);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
