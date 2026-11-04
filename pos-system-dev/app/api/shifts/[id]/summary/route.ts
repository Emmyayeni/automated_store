import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shifts, transactions, transactionItems, products, users, locations } from "@/lib/schema";
import { eq, and, sql, between } from "drizzle-orm";

// GET /api/shifts/[id]/summary - Get detailed sales summary for a shift
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params;

    // Get shift details
    const [shift] = await db
      .select({
        id: shifts.id,
        userId: shifts.userId,
        locationId: shifts.locationId,
        openedAt: shifts.openedAt,
        closedAt: shifts.closedAt,
        openingCash: shifts.openingCash,
        closingCash: shifts.closingCash,
        status: shifts.status,
        notes: shifts.notes,
        userName: users.name,
        userEmail: users.email,
        locationName: locations.name,
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.userId, users.id))
      .leftJoin(locations, eq(shifts.locationId, locations.id))
      .where(eq(shifts.id, shiftId));

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    // Get all transactions during this shift
    const whereConditions = [
      eq(transactions.cashierId, shift.userId),
      eq(transactions.locationId, shift.locationId),
    ];

    if (shift.openedAt) {
      whereConditions.push(sql`${transactions.createdAt} >= ${shift.openedAt}`);
    }
    if (shift.closedAt) {
      whereConditions.push(sql`${transactions.createdAt} <= ${shift.closedAt}`);
    } else {
      // If shift is still open, get transactions until now
      whereConditions.push(sql`${transactions.createdAt} >= ${shift.openedAt}`);
    }

    // Get transaction summary
    const [summary] = await db
      .select({
        totalTransactions: sql<number>`count(${transactions.id})`,
        totalSales: sql<number>`sum(${transactions.total})`,
        totalTax: sql<number>`sum(${transactions.taxAmount})`,
        totalDiscount: sql<number>`sum(${transactions.discountAmount})`,
      })
      .from(transactions)
      .where(and(...whereConditions));

    // Get payment method breakdown
    const paymentBreakdown = await db
      .select({
        paymentMethod: transactions.paymentMethod,
        count: sql<number>`count(*)`,
        total: sql<number>`sum(${transactions.total})`,
      })
      .from(transactions)
      .where(and(...whereConditions))
      .groupBy(transactions.paymentMethod);

    // Get hourly sales breakdown
    const hourlySales = await db
      .select({
        hour: sql<string>`extract(hour from ${transactions.createdAt})`,
        count: sql<number>`count(*)`,
        total: sql<number>`sum(${transactions.total})`,
      })
      .from(transactions)
      .where(and(...whereConditions))
      .groupBy(sql`extract(hour from ${transactions.createdAt})`)
      .orderBy(sql`extract(hour from ${transactions.createdAt})`);

    // Get top selling products during shift
    const topProducts = await db
      .select({
        productId: transactionItems.productId,
        productName: products.name,
        quantitySold: sql<number>`sum(${transactionItems.quantity})`,
        revenue: sql<number>`sum(${transactionItems.unitPrice} * ${transactionItems.quantity})`,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .innerJoin(products, eq(transactionItems.productId, products.id))
      .where(and(...whereConditions))
      .groupBy(transactionItems.productId, products.name)
      .orderBy(sql`sum(${transactionItems.quantity}) desc`)
      .limit(10);

    // Calculate cash variance if shift is closed
    let cashVariance = null;
    if (shift.status === 'closed' && shift.openingCash && shift.closingCash) {
      const cashSales = paymentBreakdown.find(p => p.paymentMethod === 'cash')?.total || 0;
      const expectedCash = Number(shift.openingCash) + cashSales;
      cashVariance = Number(shift.closingCash) - expectedCash;
    }

    const response = {
      shift: {
        ...shift,
        openingCash: shift.openingCash ? Number(shift.openingCash) : null,
        closingCash: shift.closingCash ? Number(shift.closingCash) : null,
      },
      summary: {
        totalTransactions: Number(summary?.totalTransactions || 0),
        totalSales: Number(summary?.totalSales || 0),
        totalTax: Number(summary?.totalTax || 0),
        totalDiscount: Number(summary?.totalDiscount || 0),
        cashVariance,
      },
      paymentBreakdown: paymentBreakdown.map(p => ({
        ...p,
        count: Number(p.count),
        total: Number(p.total),
      })),
      hourlySales: hourlySales.map(h => ({
        ...h,
        hour: Number(h.hour),
        count: Number(h.count),
        total: Number(h.total),
      })),
      topProducts: topProducts.map(p => ({
        ...p,
        quantitySold: Number(p.quantitySold),
        revenue: Number(p.revenue),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating shift summary:", error);
    return NextResponse.json({ error: "Failed to generate shift summary" }, { status: 500 });
  }
}
