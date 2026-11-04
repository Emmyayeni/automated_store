import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashSessions } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { closingAmount, expectedAmount } = await request.json();
    const variance = closingAmount - expectedAmount;

    const [session] = await db
      .update(cashSessions)
      .set({
        closingAmount,
        expectedAmount,
        variance: variance.toString(),
        status: "closed",
        closedAt: new Date(),
      })
      .where(eq(cashSessions.id, id))
      .returning();

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error closing cash session:", error);
    return NextResponse.json({ error: "Failed to close cash session" }, { status: 500 });
  }
}