/**
 * POST /api/transfers/:id/receive
 * Receives an IN_TRANSIT transfer — adds stock to destination branch (BR-11).
 * Tracks discrepancies between dispatched and received quantities.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { receiveTransfer } from "@/server/services/transfer.service";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (!hasPermission(user.role, PERMISSIONS.RECEIVE_TRANSFER)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: role lacks transfer receive permission" },
      { status: 403 }
    );
  }

  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing transfer ID" }, { status: 400 });
  }

  let itemsPayload: any[] = [];
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body?.items)) {
      itemsPayload = body.items.map((i: any) => ({
        transferItemId: i.transferItemId || i.itemId || i.id,
        productId: i.productId,
        quantityReceived: Number(i.quantityReceived ?? i.receivedQuantity ?? i.quantity ?? 0),
        discrepancyReason: i.discrepancyReason || undefined,
      }));
    }
  } catch {
    itemsPayload = [];
  }

  const result = await receiveTransfer(user.id, id, itemsPayload);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
