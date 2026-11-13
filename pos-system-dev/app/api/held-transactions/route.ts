import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { heldTransactions, users, customers } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId, customerId, items, subtotal, taxAmount, totalAmount, holdReason } = await request.json();

    const [heldTransaction] = await db
      .insert(heldTransactions)
      .values({
        userId,
        customerId,
        items: JSON.stringify(items),
        subtotal,
        taxAmount,
        totalAmount,
        holdReason,
      })
      .returning();

    return NextResponse.json(heldTransaction);
  } catch (error) {
    console.error("Error holding transaction:", error);
    return NextResponse.json({ error: "Failed to hold transaction" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    let whereClause = [];
    if (userId) {
      whereClause.push(eq(heldTransactions.userId, userId));
    }

    const helds = await db
      .select({
        id: heldTransactions.id,
        userId: heldTransactions.userId,
        customerId: heldTransactions.customerId,
        items: heldTransactions.items,
        subtotal: heldTransactions.subtotal,
        taxAmount: heldTransactions.taxAmount,
        totalAmount: heldTransactions.totalAmount,
        holdReason: heldTransactions.holdReason,
        createdAt: heldTransactions.createdAt,
        userName: users.name,
        customerName: customers.name,
      })
      .from(heldTransactions)
      .leftJoin(users, eq(heldTransactions.userId, users.id))
      .leftJoin(customers, eq(heldTransactions.customerId, customers.id))
      .where(whereClause.length ? and(...whereClause) : undefined)
      .orderBy(desc(heldTransactions.createdAt));

    return NextResponse.json(helds);
  } catch (error) {
    console.error("Error fetching held transactions:", error);
    return NextResponse.json({ error: "Failed to fetch held transactions" }, { status: 500 });
  }
}