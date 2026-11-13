import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loyaltyTransactions, customers } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { customerId, businessId, transactionId, points, transactionType, description } = await request.json();
    const type = transactionType === "earn" ? "earned" : transactionType === "redeem" ? "redeemed" : transactionType;

    // Record loyalty transaction
    const [loyaltyTransaction] = await db
      .insert(loyaltyTransactions)
      .values({
        customerId,
        transactionId,
        businessId,
        type,
        points,
        description,
      })
      .returning();

    // Update customer loyalty points
    const multiplier = type === "earned" ? 1 : -1;
    await db
      .update(customers)
      .set({
        loyaltyPoints: sql`${customers.loyaltyPoints} + ${points * multiplier}`,
      })
      .where(eq(customers.id, customerId));

    return NextResponse.json(loyaltyTransaction);
  } 
  catch (error) {
    console.error("Error processing loyalty points:", error);
    return NextResponse.json({ error: "Failed to process loyalty points" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }

    const transactions = await db
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.customerId, customerId))
      .orderBy(desc(loyaltyTransactions.createdAt));

    const [customer] = await db
      .select({ loyaltyPoints: customers.loyaltyPoints })
      .from(customers)
      .where(eq(customers.id, customerId));

    return NextResponse.json({
      currentPoints: customer?.loyaltyPoints || 0,
      transactions: transactions.map((t) => ({
        id: t.id,
        transactionType: t.type,
        points: t.points,
        description: t.description,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching loyalty points:", error);
    return NextResponse.json({ error: "Failed to fetch loyalty points" }, { status: 500 });
  }
}