import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { shifts, transactions, users, locations, businesses } from "@/lib/schema"
import { eq, and, desc, gte, lte, sql, between } from "drizzle-orm"
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createAuthErrorResponse,
  createAuthorizationErrorResponse 
} from "@/lib/standards/api-responses";
import { 
  handleApiError, 
  createErrorContext,
  ValidationError 
} from "@/lib/standards/error-handling";
import { 
  validateSession, 
  validateRole 
} from "@/lib/standards/auth-patterns";
import { formatApiDate } from "@/lib/standards/formatting";
import { ValidationRules, createValidator } from "@/lib/standards/validation";

export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session and require admin role
    const accessControl = await validateRole(['ADMIN']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get("businessId")
    const locationId = searchParams.get("locationId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Validate required business ID
    if (!businessId) {
      throw new ValidationError("Business ID is required", "businessId", businessId, context);
    }

    // Validate business ID format
    const uuidValidator = createValidator<string>('Business ID')
      .addRule(ValidationRules.custom(
        (value: string) => /^[0-9a-fA-F-]{36}$/.test(value),
        'Invalid business ID format'
      ));
    
    const businessValidation = uuidValidator.validate(businessId);
    if (!businessValidation.isValid) {
      throw new ValidationError(businessValidation.error!, 'businessId', businessId, context);
    }

    // Validate location ID if provided
    if (locationId) {
      const locationValidation = uuidValidator.validate(locationId);
      if (!locationValidation.isValid) {
        throw new ValidationError('Invalid location ID format', 'locationId', locationId, context);
      }
    }

    // Validate date range using centralized utilities
    const dateValidator = createValidator<string>('Date')
      .addRule(ValidationRules.date('Date'));
    
    if (startDate) {
      const startValidation = dateValidator.validate(startDate);
      if (!startValidation.isValid) {
        throw new ValidationError('Invalid start date format', 'startDate', startDate, context);
      }
    }
    
    if (endDate) {
      const endValidation = dateValidator.validate(endDate);
      if (!endValidation.isValid) {
        throw new ValidationError('Invalid end date format', 'endDate', endDate, context);
      }
    }
    
    // Validate date range logic
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        throw new ValidationError('Start date must be before end date', 'dateRange', { startDate, endDate }, context);
      }
    }

    // Build date filter
    const dateFilter = []
    if (startDate) {
      dateFilter.push(gte(shifts.startTime, new Date(startDate)))
    }
    if (endDate) {
      dateFilter.push(lte(shifts.endTime, new Date(endDate)))
    }

    // Build location filter
    const locationFilter = locationId ? eq(shifts.locationId, locationId) : undefined

    // Base query conditions
    const baseConditions = [
      eq(shifts.businessId, businessId),
      ...dateFilter,
      ...(locationFilter ? [locationFilter] : [])
    ]

    // Get overview metrics
    const overviewQuery = await db
      .select({
        totalShifts: sql<number>`COUNT(DISTINCT ${shifts.id})`,
        totalRevenue: sql<number>`COALESCE(SUM(${shifts.totalSales}), 0)`,
        averageShiftDuration: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${shifts.endTime} - ${shifts.startTime})) / 60), 0)`,
        shiftsWithVariance: sql<number>`COUNT(CASE WHEN ${shifts.cashVariance} != 0 THEN 1 END)`,
        completedShifts: sql<number>`COUNT(CASE WHEN ${shifts.status} = 'completed' THEN 1 END)`
      })
      .from(shifts)
      .where(and(...baseConditions))

    const overview = overviewQuery[0]
    const averageRevenuePerShift = overview.totalShifts > 0 ? overview.totalRevenue / overview.totalShifts : 0
    const cashVarianceRate = overview.totalShifts > 0 ? (overview.shiftsWithVariance / overview.totalShifts) * 100 : 0
    const completionRate = overview.totalShifts > 0 ? (overview.completedShifts / overview.totalShifts) * 100 : 0

    // Get variance analysis
    const varianceQuery = await db
      .select({
        totalVariances: sql<number>`COUNT(CASE WHEN ${shifts.cashVariance} != 0 THEN 1 END)`,
        majorVariances: sql<number>`COUNT(CASE WHEN ABS(${shifts.cashVariance}) >= 5000 THEN 1 END)`,
        minorVariances: sql<number>`COUNT(CASE WHEN ABS(${shifts.cashVariance}) > 0 AND ABS(${shifts.cashVariance}) < 5000 THEN 1 END)`,
        averageVariance: sql<number>`COALESCE(AVG(ABS(${shifts.cashVariance})), 0)`
      })
      .from(shifts)
      .where(and(...baseConditions))

    // Get variances by location
    const variancesByLocationQuery = await db
      .select({
        locationId: shifts.locationId,
        locationName: locations.name,
        varianceCount: sql<number>`COUNT(CASE WHEN ${shifts.cashVariance} != 0 THEN 1 END)`,
        totalVariance: sql<number>`COALESCE(SUM(${shifts.cashVariance}), 0)`
      })
      .from(shifts)
      .innerJoin(locations, eq(shifts.locationId, locations.id))
      .where(and(...baseConditions))
      .groupBy(shifts.locationId, locations.name)
      .orderBy(sql`COUNT(CASE WHEN ${shifts.cashVariance} != 0 THEN 1 END) DESC`)

    // Get top performing staff
    const topPerformersQuery = await db
      .select({
        userId: shifts.userId,
        staffName: users.name,
        averageRevenue: sql<number>`COALESCE(AVG(${shifts.totalSales}), 0)`,
        shiftCount: sql<number>`COUNT(${shifts.id})`,
        averageTransactions: sql<number>`COALESCE(AVG(${shifts.transactionCount}), 0)`,
        totalVariance: sql<number>`COALESCE(SUM(ABS(${shifts.cashVariance})), 0)`
      })
      .from(shifts)
      .innerJoin(users, eq(shifts.userId, users.id))
      .where(and(...baseConditions))
      .groupBy(shifts.userId, users.name)
      .orderBy(sql`COALESCE(AVG(${shifts.totalSales}), 0) DESC`)
      .limit(10)

    // Calculate efficiency scores for staff
    const topPerformers = topPerformersQuery.map(performer => {
      const varianceScore = Math.max(0, 100 - (performer.totalVariance / 1000)) // Penalize variances
      const revenueScore = Math.min(100, (performer.averageRevenue / 50000) * 100) // Scale based on revenue
      const efficiencyScore = Math.round((varianceScore * 0.3 + revenueScore * 0.7))
      
      return {
        ...performer,
        efficiencyScore
      }
    })

    // Get location performance
    const locationPerformanceQuery = await db
      .select({
        locationId: shifts.locationId,
        locationName: locations.name,
        averageRevenue: sql<number>`COALESCE(AVG(${shifts.totalSales}), 0)`,
        shiftCount: sql<number>`COUNT(${shifts.id})`,
        totalVariance: sql<number>`COALESCE(SUM(ABS(${shifts.cashVariance})), 0)`
      })
      .from(shifts)
      .innerJoin(locations, eq(shifts.locationId, locations.id))
      .where(and(...baseConditions))
      .groupBy(shifts.locationId, locations.name)
      .orderBy(sql`COALESCE(AVG(${shifts.totalSales}), 0) DESC`)

    // Calculate location efficiency
    const locationPerformance = locationPerformanceQuery.map(location => {
      const varianceScore = Math.max(0, 100 - (location.totalVariance / 5000))
      const revenueScore = Math.min(100, (location.averageRevenue / 75000) * 100)
      const averageEfficiency = Math.round((varianceScore * 0.4 + revenueScore * 0.6))
      
      return {
        ...location,
        averageEfficiency
      }
    })

    // Get daily trends (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyTrendsQuery = await db
      .select({
        date: sql<string>`DATE(${shifts.startTime})`,
        shiftCount: sql<number>`COUNT(${shifts.id})`,
        totalRevenue: sql<number>`COALESCE(SUM(${shifts.totalSales}), 0)`,
        varianceCount: sql<number>`COUNT(CASE WHEN ${shifts.cashVariance} != 0 THEN 1 END)`
      })
      .from(shifts)
      .where(and(
        eq(shifts.businessId, businessId),
        gte(shifts.startTime, thirtyDaysAgo),
        ...(locationFilter ? [locationFilter] : [])
      ))
      .groupBy(sql`DATE(${shifts.startTime})`)
      .orderBy(sql`DATE(${shifts.startTime}) DESC`)
      .limit(30)

    // Get hourly patterns
    const hourlyPatternsQuery = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${shifts.startTime})`,
        averageRevenue: sql<number>`COALESCE(AVG(${shifts.totalSales}), 0)`,
        shiftCount: sql<number>`COUNT(${shifts.id})`
      })
      .from(shifts)
      .where(and(...baseConditions))
      .groupBy(sql`EXTRACT(HOUR FROM ${shifts.startTime})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${shifts.startTime})`)

    const analyticsData = {
      overview: {
        totalShifts: overview.totalShifts,
        averageShiftDuration: overview.averageShiftDuration,
        totalRevenue: overview.totalRevenue,
        averageRevenuePerShift,
        cashVarianceRate,
        completionRate
      },
      variances: {
        ...varianceQuery[0],
        variancesByLocation: variancesByLocationQuery
      },
      performance: {
        topPerformers,
        locationPerformance
      },
      trends: {
        dailyTrends: dailyTrendsQuery,
        hourlyPatterns: hourlyPatternsQuery
      }
    }

    return NextResponse.json(createSuccessResponse({
      ...analyticsData,
      metadata: {
        generatedAt: formatApiDate(new Date()),
        generatedBy: accessControl.user.id,
        businessId,
        locationId,
        dateRange: { startDate, endDate }
      }
    }));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}