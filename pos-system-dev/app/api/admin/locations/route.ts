import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { locations, businesses } from "@/lib/schema"
import { eq, and } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = ((session.user as any).role || "").toUpperCase()
    if (userRole !== "ADMIN" && userRole !== "BRANCH_MANAGER" && userRole !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get("businessId") || (session.user as any).businessId

    const baseQuery = db
      .select({
        id: locations.id,
        name: locations.name,
        address: locations.address,
        phone: locations.phone,
        email: locations.email,
        status: locations.status,
        managerId: locations.managerId,
        timezone: locations.timezone,
        currency: locations.currency,
        taxRate: locations.taxRate,
        revenue: locations.revenue,
        createdAt: locations.createdAt,
        updatedAt: locations.updatedAt
      })
      .from(locations)

    const locationsQuery = businessId
      ? await baseQuery.where(eq(locations.businessId, businessId)).orderBy(locations.name)
      : await baseQuery.orderBy(locations.name)

    return NextResponse.json(locationsQuery)

  } catch (error) {
    console.error("Error fetching admin locations:", error)
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    )
  }
}