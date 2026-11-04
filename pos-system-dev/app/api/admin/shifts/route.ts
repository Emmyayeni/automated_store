import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { shifts, transactions, users, locations, businesses } from "@/lib/schema"
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can access cross-location shift data
    const userRole = (session.user as any).role
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get("businessId")
    const locationId = searchParams.get("locationId")
    const staffId = searchParams.get("staffId")
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const hasVariance = searchParams.get("hasVariance")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    if (!businessId) {
      return NextResponse.json({ error: "Business ID is required" }, { status: 400 })
    }

    // Build query conditions
    const conditions = [eq(shifts.businessId, businessId)]

    if (locationId) {
      conditions.push(eq(shifts.locationId, locationId))
    }

    if (staffId) {
      conditions.push(eq(shifts.userId, staffId))
    }

    if (status && ['active', 'completed', 'cancelled'].includes(status)) {
      conditions.push(eq(shifts.status, status as 'active' | 'completed' | 'cancelled'))
    }

    if (startDate) {
      conditions.push(gte(shifts.startTime, new Date(startDate)))
    }

    if (endDate) {
      conditions.push(lte(shifts.endTime, new Date(endDate)))
    }

    if (hasVariance === "true") {
      conditions.push(sql`${shifts.cashVariance} != '0'`)
    } else if (hasVariance === "false") {
      conditions.push(sql`${shifts.cashVariance} = '0'`)
    }

    // Get shifts with related data
    const shiftsQuery = await db
      .select({
        id: shifts.id,
        status: shifts.status,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        totalSales: shifts.totalSales,
        transactionCount: shifts.transactionCount,
        cashVariance: shifts.cashVariance,
        openingCash: shifts.openingCash,
        closingCash: shifts.closingCash,
        notes: shifts.notes,
        staffName: users.name,
        staffId: shifts.userId,
        locationName: locations.name,
        locationId: shifts.locationId
      })
      .from(shifts)
      .innerJoin(users, eq(shifts.userId, users.id))
      .innerJoin(locations, eq(shifts.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(desc(shifts.startTime))
      .limit(limit)
      .offset((page - 1) * limit)

    // Get total count for pagination
    const totalCountQuery = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(shifts)
      .where(and(...conditions))

    const totalCount = totalCountQuery[0].count
    const totalPages = Math.ceil(totalCount / limit)

    // Get summary statistics
    const summaryQuery = await db
      .select({
        totalShifts: sql<number>`COUNT(*)`,
        activeShifts: sql<number>`COUNT(CASE WHEN ${shifts.status} = 'active' THEN 1 END)`,
        completedShifts: sql<number>`COUNT(CASE WHEN ${shifts.status} = 'completed' THEN 1 END)`,
        totalRevenue: sql<number>`COALESCE(SUM(${shifts.totalSales}), 0)`,
        totalVariance: sql<number>`COALESCE(SUM(${shifts.cashVariance}), 0)`,
        averageVariance: sql<number>`COALESCE(AVG(ABS(${shifts.cashVariance})), 0)`,
        shiftsWithVariance: sql<number>`COUNT(CASE WHEN ${shifts.cashVariance} != 0 THEN 1 END)`,
        majorVariances: sql<number>`COUNT(CASE WHEN ABS(${shifts.cashVariance}) >= 5000 THEN 1 END)`
      })
      .from(shifts)
      .where(and(...conditions))

    const summary = summaryQuery[0]

    // Get location breakdown
    const locationBreakdownQuery = await db
      .select({
        locationId: shifts.locationId,
        locationName: locations.name,
        shiftCount: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(${shifts.totalSales}), 0)`,
        totalVariance: sql<number>`COALESCE(SUM(${shifts.cashVariance}), 0)`,
        activeShifts: sql<number>`COUNT(CASE WHEN ${shifts.status} = 'active' THEN 1 END)`
      })
      .from(shifts)
      .innerJoin(locations, eq(shifts.locationId, locations.id))
      .where(and(...conditions))
      .groupBy(shifts.locationId, locations.name)
      .orderBy(sql`COUNT(*) DESC`)

    // Get staff breakdown
    const staffBreakdownQuery = await db
      .select({
        staffId: shifts.userId,
        staffName: users.name,
        shiftCount: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(${shifts.totalSales}), 0)`,
        totalVariance: sql<number>`COALESCE(SUM(${shifts.cashVariance}), 0)`,
        averageShiftDuration: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${shifts.endTime} - ${shifts.startTime})) / 3600), 0)`,
        activeShifts: sql<number>`COUNT(CASE WHEN ${shifts.status} = 'active' THEN 1 END)`
      })
      .from(shifts)
      .innerJoin(users, eq(shifts.userId, users.id))
      .where(and(...conditions))
      .groupBy(shifts.userId, users.name)
      .orderBy(sql`COALESCE(SUM(${shifts.totalSales}), 0) DESC`)

    const response = {
      shifts: shiftsQuery,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      summary,
      breakdowns: {
        locations: locationBreakdownQuery,
        staff: staffBreakdownQuery
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error fetching admin shifts:", error)
    return NextResponse.json(
      { error: "Failed to fetch shifts" },
      { status: 500 }
    )
  }
}