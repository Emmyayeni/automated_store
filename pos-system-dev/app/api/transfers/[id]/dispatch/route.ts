/**
 * POST /api/transfers/:id/dispatch
 * Dispatches an APPROVED transfer — deducts stock from source branch (BR-10).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dispatchTransfer } from "@/server/services/transfer.service";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!hasPermission(user.role, PERMISSIONS.DISPATCH_TRANSFER)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await dispatchTransfer(user.id, id);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
