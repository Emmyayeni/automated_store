/**
 * POST /api/transfers/:id/reject
 * Manager/Admin rejects a REQUESTED transfer with a reason.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { rejectTransfer } from "@/server/services/transfer.service";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

const schema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!hasPermission(user.role, PERMISSIONS.APPROVE_TRANSFER)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Rejection reason is required." }, { status: 400 });
  }

  const { id } = await params;
  const result = await rejectTransfer(user.id, id, parsed.data.reason);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
