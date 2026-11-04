import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { heldTransactions } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Get held transaction
    const [heldTransaction] = await db
      .select()
      .from(heldTransactions)
      .where(eq(heldTransactions.id, id));

    if (!heldTransaction) {
      return NextResponse.json({ error: "Held transaction not found" }, { status: 404 });
    }

    // Delete held transaction
    await db
      .delete(heldTransactions)
      .where(eq(heldTransactions.id, id));

    return NextResponse.json({
      items: heldTransaction.items,
      customerId: heldTransaction.customerId,
      subtotal: Number.parseFloat(heldTransaction.subtotal as any),
      taxAmount: Number.parseFloat(heldTransaction.taxAmount as any),
      totalAmount: Number.parseFloat(heldTransaction.totalAmount as any),
    });
  } catch (error) {
    console.error("Error retrieving held transaction:", error);
    return NextResponse.json({ error: "Failed to retrieve held transaction" }, { status: 500 });
  }
}