import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { shifts, transactions, users, locations, businesses, products, transactionItems } from "@/lib/schema"
import { eq, and, desc, gte, lte, sql, between, inArray } from "drizzle-orm"
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
    const reportType = searchParams.get("reportType") || "overview"
    const locationId = searchParams.get("locationId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const period = searchParams.get("period") || "week"

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

    // Validate report type
    const validReportTypes = ['overview', 'sales', 'locations', 'staff', 'products', 'payments', 'time-analytics', 'customers', 'all'];
    const reportTypeValidator = createValidator<string>('Report type')
      .addRule(ValidationRules.custom(
        (value: string) => validReportTypes.includes(value),
        `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
      ));
    
    const reportTypeValidation = reportTypeValidator.validate(reportType);
    if (!reportTypeValidation.isValid) {
      throw new ValidationError(reportTypeValidation.error!, 'reportType', reportType, context);
    }

    // Validate period
    const validPeriods = ['day', 'week', 'month', 'year'];
    const periodValidator = createValidator<string>('Period')
      .addRule(ValidationRules.custom(
        (value: string) => validPeriods.includes(value),
        `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      ));
    
    const periodValidation = periodValidator.validate(period);
    if (!periodValidation.isValid) {
      throw new ValidationError(periodValidation.error!, 'period', period, context);
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
      dateFilter.push(gte(transactions.createdAt, new Date(startDate)))
    }
    if (endDate) {
      dateFilter.push(lte(transactions.createdAt, new Date(endDate)))
    }

    // Build location filter
    const locationFilter = locationId ? eq(transactions.locationId, locationId) : undefined

    // Base query conditions
    const baseConditions = [
      eq(transactions.businessId, businessId),
      eq(transactions.status, "completed"),
      ...dateFilter,
      ...(locationFilter ? [locationFilter] : [])
    ]

    const response: any = {}

    // Overview Report
    if (reportType === "overview" || reportType === "all") {
      const overviewQuery = await db
        .select({
          totalTransactions: sql<number>`COUNT(DISTINCT ${transactions.id})`,
          totalRevenue: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
          totalItems: sql<number>`COALESCE(SUM(${transactions.itemCount}), 0)`,
          averageTransaction: sql<number>`COALESCE(AVG(${transactions.total}), 0)`,
          totalTax: sql<number>`COALESCE(SUM(${transactions.taxAmount}), 0)`,
          totalDiscount: sql<number>`COALESCE(SUM(${transactions.discountAmount}), 0)`
        })
        .from(transactions)
        .where(and(...baseConditions))

      response.overview = overviewQuery[0]
    }

    // Sales Trends Report
    if (reportType === "sales" || reportType === "all") {
      let dateGroupBy = sql`DATE(${transactions.createdAt})`
      let dateOrderBy = sql`DATE(${transactions.createdAt})`
      
      if (period === "hour") {
        dateGroupBy = sql`DATE_TRUNC('hour', ${transactions.createdAt})`
        dateOrderBy = sql`DATE_TRUNC('hour', ${transactions.createdAt})`
      } else if (period === "month") {
        dateGroupBy = sql`DATE_TRUNC('month', ${transactions.createdAt})`
        dateOrderBy = sql`DATE_TRUNC('month', ${transactions.createdAt})`
      } else if (period === "year") {
        dateGroupBy = sql`DATE_TRUNC('year', ${transactions.createdAt})`
        dateOrderBy = sql`DATE_TRUNC('year', ${transactions.createdAt})`
      }

      const salesTrendsQuery = await db
        .select({
          period: dateGroupBy,
          transactionCount: sql<number>`COUNT(${transactions.id})`,
          totalRevenue: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
          averageTransaction: sql<number>`COALESCE(AVG(${transactions.total}), 0)`,
          totalItems: sql<number>`COALESCE(SUM(${transactions.itemCount}), 0)`
        })
        .from(transactions)
        .where(and(...baseConditions))
        .groupBy(dateGroupBy)
        .orderBy(dateOrderBy)

      response.salesTrends = salesTrendsQuery
    }

    // Location Performance Report
    if (reportType === "locations" || reportType === "all") {
      const locationPerformanceQuery = await db
        .select({
          locationId: transactions.locationId,
          locationName: locations.name,
          transactionCount: sql<number>`COUNT(${transactions.id})`,
          totalRevenue: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
          averageTransaction: sql<number>`COALESCE(AVG(${transactions.total}), 0)`,
          totalItems: sql<number>`COALESCE(SUM(${transactions.itemCount}), 0)`,
          totalTax: sql<number>`COALESCE(SUM(${transactions.taxAmount}), 0)`
        })
        .from(transactions)
        .innerJoin(locations, eq(transactions.locationId, locations.id))
        .where(and(...baseConditions))
        .groupBy(transactions.locationId, locations.name)
        .orderBy(sql`COALESCE(SUM(${transactions.total}), 0) DESC`)

      response.locationPerformance = locationPerformanceQuery
    }

    // Staff Performance Report
    if (reportType === "staff" || reportType === "all") {
      const staffPerformanceQuery = await db
        .select({
          cashierId: transactions.cashierId,
          staffName: users.name,
          transactionCount: sql<number>`COUNT(${transactions.id})`,
          totalRevenue: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
          averageTransaction: sql<number>`COALESCE(AVG(${transactions.total}), 0)`,
          totalItems: sql<number>`COALESCE(SUM(${transactions.itemCount}), 0)`,
          shiftsWorked: sql<number>`COUNT(DISTINCT ${shifts.id})`
        })
        .from(transactions)
        .innerJoin(users, eq(transactions.cashierId, users.id))
        .leftJoin(shifts, and(
          eq(shifts.userId, users.id),
          eq(shifts.businessId, businessId)
        ))
        .where(and(...baseConditions))
        .groupBy(transactions.cashierId, users.name)
        .orderBy(sql`COALESCE(SUM(${transactions.total}), 0) DESC`)

      response.staffPerformance = staffPerformanceQuery
    }

    // Product Performance Report
    if (reportType === "products" || reportType === "all") {
      const productPerformanceQuery = await db
        .select({
          productId: transactionItems.productId,
          productName: products.name,
          productSku: products.sku,
          quantitySold: sql<number>`COALESCE(SUM(${transactionItems.quantity}), 0)`,
          totalRevenue: sql<number>`COALESCE(SUM(${transactionItems.lineTotal}), 0)`,
          averagePrice: sql<number>`COALESCE(AVG(${transactionItems.unitPrice}), 0)`,
          transactionCount: sql<number>`COUNT(DISTINCT ${transactionItems.transactionId})`
        })
        .from(transactionItems)
        .innerJoin(products, eq(transactionItems.productId, products.id))
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .where(and(...baseConditions))
        .groupBy(transactionItems.productId, products.name, products.sku)
        .orderBy(sql`COALESCE(SUM(${transactionItems.lineTotal}), 0) DESC`)
        .limit(50)

      response.productPerformance = productPerformanceQuery
    }

    // Payment Methods Report
    if (reportType === "payments" || reportType === "all") {
      const paymentMethodsQuery = await db
        .select({
          paymentMethod: transactions.paymentMethod,
          transactionCount: sql<number>`COUNT(${transactions.id})`,
          totalAmount: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
          averageAmount: sql<number>`COALESCE(AVG(${transactions.total}), 0)`,
          percentage: sql<number>`ROUND((COUNT(${transactions.id}) * 100.0 / (SELECT COUNT(*) FROM ${transactions} WHERE ${eq(transactions.businessId, businessId)})), 2)`
        })
        .from(transactions)
        .where(and(...baseConditions))
        .groupBy(transactions.paymentMethod)
        .orderBy(sql`COALESCE(SUM(${transactions.total}), 0) DESC`)

      response.paymentMethods = paymentMethodsQuery
    }

    // Time-based Analytics
    if (reportType === "time-analytics" || reportType === "all") {
      // Hourly patterns
      const hourlyPatternsQuery = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${transactions.createdAt})`,
          transactionCount: sql<number>`COUNT(${transactions.id})`,
          totalRevenue: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
          averageTransaction: sql<number>`COALESCE(AVG(${transactions.total}), 0)`
        })
        .from(transactions)
        .where(and(...baseConditions))
        .groupBy(sql`EXTRACT(HOUR FROM ${transactions.createdAt})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${transactions.createdAt})`)

      // Day of week patterns
      const dayOfWeekQuery = await db
        .select({
          dayOfWeek: sql<number>`EXTRACT(DOW FROM ${transactions.createdAt})`,
          dayName: sql<string>`CASE EXTRACT(DOW FROM ${transactions.createdAt})
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END`,
          transactionCount: sql<number>`COUNT(${transactions.id})`,
          totalRevenue: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
          averageTransaction: sql<number>`COALESCE(AVG(${transactions.total}), 0)`
        })
        .from(transactions)
        .where(and(...baseConditions))
        .groupBy(sql`EXTRACT(DOW FROM ${transactions.createdAt})`)
        .orderBy(sql`EXTRACT(DOW FROM ${transactions.createdAt})`)

      response.timeAnalytics = {
        hourlyPatterns: hourlyPatternsQuery,
        dayOfWeekPatterns: dayOfWeekQuery
      }
    }

    // Customer Analytics (if customer data exists)
    if (reportType === "customers" || reportType === "all") {
      const customerAnalyticsQuery = await db
        .select({
          newCustomers: sql<number>`COUNT(DISTINCT CASE WHEN ${transactions.customerId} IS NOT NULL THEN ${transactions.customerId} END)`,
          returningCustomers: sql<number>`COUNT(DISTINCT ${transactions.customerId}) - COUNT(DISTINCT CASE WHEN ${transactions.customerId} IS NOT NULL THEN ${transactions.customerId} END)`,
          averageCustomerValue: sql<number>`COALESCE(AVG(${transactions.total}), 0)`,
          transactionsWithCustomer: sql<number>`COUNT(CASE WHEN ${transactions.customerId} IS NOT NULL THEN 1 END)`,
          transactionsWithoutCustomer: sql<number>`COUNT(CASE WHEN ${transactions.customerId} IS NULL THEN 1 END)`
        })
        .from(transactions)
        .where(and(...baseConditions))

      response.customerAnalytics = customerAnalyticsQuery[0]
    }

    return NextResponse.json(createSuccessResponse({
      ...response,
      metadata: {
        generatedAt: formatApiDate(new Date()),
        generatedBy: accessControl.user.id,
        businessId,
        locationId,
        reportType,
        period,
        dateRange: { startDate, endDate }
      }
    }));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}