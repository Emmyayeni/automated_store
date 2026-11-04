/**
 * POST /api/transfers/:id/approve
 * Manager/Admin approves a REQUESTED transfer.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { approveTransfer } from "@/server/services/transfer.service";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!hasPermission(user.role, PERMISSIONS.APPROVE_TRANSFER)) {
    return NextResponse.json({ success: false, error: "Forbidden: only managers can approve transfers" }, { status: 403 });
  }

  const { id } = await params;
  const result = await approveTransfer(user.id, id);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
