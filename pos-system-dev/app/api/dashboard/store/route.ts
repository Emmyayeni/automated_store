import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { products, inventory, transactions } from "@/lib/schema"
import { eq, and, gte, lte, sql } from "drizzle-orm"

// Helper: get today's date range in UTC
function getTodayRange() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
  return { start, end }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const locationId = searchParams.get("locationId")

  if (!locationId) {
    return NextResponse.json({ error: "Missing locationId" }, { status: 400 })
  }

  // Product count for this location (active products in inventory at this location)
  const productsCount = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${inventory.productId})` })
    .from(inventory)
    .where(eq(inventory.locationId, locationId))
    .then(r => Number(r[0]?.count ?? 0))

  // Low stock items at this location
  const lowStockCount = await db
    .select({ count: sql<number>`COUNT(${inventory.id})` })
    .from(inventory)
    .where(and(eq(inventory.locationId, locationId), lte(inventory.quantity, inventory.minStockLevel)))
    .then(r => Number(r[0]?.count ?? 0))

  // Sales today at this location
  const { start, end } = getTodayRange()
  const salesToday = await db
    .select({ sum: sql<number>`SUM(${transactions.total})` })
    .from(transactions)
    .where(
      and(
        eq(transactions.locationId, locationId),
        gte(transactions.paidAt, start),
        lte(transactions.paidAt, end)
      )
    )
    .then(r => Number(r[0]?.sum ?? 0))

  // Revenue target: total value of all products at this location (sum of sellPrice * quantity)
  const revenueTarget = await db
    .select({ total: sql<number>`SUM(${inventory.sellPrice} * ${inventory.quantity})` })
    .from(inventory)
    .where(eq(inventory.locationId, locationId))
    .then(r => Number(r[0]?.total ?? 0))

  // Progress towards target
  const revenueProgress = revenueTarget > 0 ? Math.round((salesToday / revenueTarget) * 100) : 0

  return NextResponse.json({
    products: productsCount,
    lowStock: lowStockCount,
    salesToday,
    revenueTarget,
    revenueProgress,
  })
}