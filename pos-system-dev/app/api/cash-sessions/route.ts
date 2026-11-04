import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashSessions } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId, openingAmount } = await request.json();

    // Check if user has an open session
    const existingSessions = await db
      .select({ id: cashSessions.id })
      .from(cashSessions)
      .where(and(eq(cashSessions.userId, userId), eq(cashSessions.status, "open")));

    if (existingSessions.length > 0) {
      return NextResponse.json({ error: "User already has an open cash session" }, { status: 400 });
    }

    const [session] = await db
      .insert(cashSessions)
      .values({
        userId,
        openingAmount,
      })
      .returning();

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error creating cash session:", error);
    return NextResponse.json({ error: "Failed to create cash session" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const statusParam = searchParams.get("status");
    const status = statusParam === "open" || statusParam === "closed" ? statusParam : undefined;

    let whereClause = undefined;
    if (userId && status) {
      whereClause = and(eq(cashSessions.userId, userId), eq(cashSessions.status, status));
    } else if (userId) {
      // Optionally handle userId only case
    } else if (status) {
      whereClause = eq(cashSessions.status, status as "open" | "closed");
    }

    const sessions = await db
      .select()
      .from(cashSessions)
      .where(whereClause)
      .orderBy(desc(cashSessions.openedAt));

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching cash sessions:", error);
    return NextResponse.json({ error: "Failed to fetch cash sessions" }, { status: 500 });
  }
}