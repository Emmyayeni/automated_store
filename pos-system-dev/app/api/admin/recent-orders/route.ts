import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, locations } from "@/lib/schema";
import { eq } from "drizzle-orm";


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const results = await db
    .select({
      transactionId: transactions.id,
      transactionNumber: transactions.transactionNumber,
      locationId: transactions.locationId,
      storeName: locations.name,
      subtotal: transactions.subtotal,
      taxAmount: transactions.taxAmount,
      total: transactions.total,
      paymentMethod: transactions.paymentMethod,
      status: transactions.status,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .innerJoin(locations, eq(transactions.locationId, locations.id))
    .where(eq(locations.businessId, businessId));

  return NextResponse.json(results);
}