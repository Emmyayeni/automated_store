import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, staffInvites } from "@/lib/schema"
import { eq, and, count, ilike } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const locationId = searchParams.get("locationId")

  if (!locationId) {
    return NextResponse.json({ error: "Missing locationId" }, { status: 400 })
  }


  const total = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.isActive, true), eq(users.locationId, locationId)))
    .then(r => Number(r[0]?.count ?? 0))

  const managers = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        ilike(users.role, "manager"),
        eq(users.locationId, locationId)
      )
    )
    .then(r => Number(r[0]?.count ?? 0))

  const cashiers = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        ilike(users.role, "cashier"),
        eq(users.locationId, locationId)
      )
    )
    .then(r => Number(r[0]?.count ?? 0))

  const pending = await db
    .select({ count: count() })
    .from(staffInvites)
    .where(and(eq(staffInvites.accepted, false), eq(staffInvites.locationId, locationId)))
    .then(r => Number(r[0]?.count ?? 0))

  return NextResponse.json({
    total,
    managers,
    cashiers,
    pending,
  })
}