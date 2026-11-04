import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, transactionItems, products, users } from "@/lib/schema";
import { and, gte, lte, eq, desc, sql as dsql, inArray } from "drizzle-orm";
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
  validatePermission 
} from "@/lib/standards/auth-patterns";
import { formatDate } from "@/lib/standards/formatting";

export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session and require reports permission
    const accessControl = await validatePermission('reports.sales');
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr =
      searchParams.get("startDate") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDateStr = searchParams.get("endDate") || new Date().toISOString();
    const locationId = searchParams.get("locationId");

    if (!locationId || locationId.trim() === "") {
      throw new ValidationError("locationId is required", "locationId", locationId, context);
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Get all user IDs for the location
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.locationId, locationId));
    const userIds = userRows.map((u) => u.id);

    // Debug log
    console.log("locationId:", locationId, "userIds:", userIds);

    if (!userIds.length) {
      return NextResponse.json(createSuccessResponse({
        summary: {
          total_transactions: 0,
          total_revenue: 0,
          total_tax: 0,
          average_transaction: 0,
        },
        dailySales: [],
        topProducts: [],
        paymentMethods: [],
        dateRange: {
          start: formatDate(startDate),
          end: formatDate(endDate)
        },
        generatedAt: new Date().toISOString(),
        generatedBy: accessControl.user.id
      }));
    }

    // Helper for inArray only if userIds is not empty
    const userFilter = inArray(transactions.cashierId, userIds);

    // Daily sales summary
    const dailySales = await db
      .select({
        date: dsql`DATE(${transactions.createdAt})`.as("date"),
        transaction_count: dsql`COUNT(*)`,
        total_sales: dsql`SUM(${transactions.total})`,
        total_tax: dsql`SUM(${transactions.taxAmount})`,
        average_sale: dsql`AVG(${transactions.total})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, "completed"),
          gte(transactions.createdAt, startDate),
          lte(transactions.createdAt, endDate),
          userFilter
        )
      )
      .groupBy(dsql`DATE(${transactions.createdAt})`)
      .orderBy(desc(dsql`DATE(${transactions.createdAt})`));

    // Top selling products
    const topProducts = await db
      .select({
        name: products.name,
        sku: products.sku,
        total_quantity: dsql`SUM(${transactionItems.quantity})`,
        total_revenue: dsql`SUM(${transactionItems.lineTotal})`,
      })
      .from(transactionItems)
      .innerJoin(products, eq(transactionItems.productId, products.id))
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.status, "completed"),
          gte(transactions.createdAt, startDate),
          lte(transactions.createdAt, endDate),
          userFilter
        )
      )
      .groupBy(products.id, products.name, products.sku)
      .orderBy(desc(dsql`SUM(${transactionItems.quantity})`))
      .limit(10);

    // Payment method breakdown
    const paymentMethods = await db
      .select({
        payment_method: transactions.paymentMethod,
        transaction_count: dsql`COUNT(*)`,
        total_amount: dsql`SUM(${transactions.total})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, "completed"),
          gte(transactions.createdAt, startDate),
          lte(transactions.createdAt, endDate),
          userFilter
        )
      )
      .groupBy(transactions.paymentMethod)
      .orderBy(desc(dsql`SUM(${transactions.total})`));

    // Overall summary
    const summaryArr = await db
      .select({
        total_transactions: dsql`COUNT(*)`,
        total_revenue: dsql`SUM(${transactions.total})`,
        total_tax: dsql`SUM(${transactions.taxAmount})`,
        average_transaction: dsql`AVG(${transactions.total})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, "completed"),
          gte(transactions.createdAt, startDate),
          lte(transactions.createdAt, endDate),
          userFilter
        )
      );

    const summary = summaryArr[0] || {
      total_transactions: 0,
      total_revenue: 0,
      total_tax: 0,
      average_transaction: 0,
    };

    // Debug log
    console.log("summary:", summary);
    console.log("dailySales:", dailySales);
    console.log("topProducts:", topProducts);
    console.log("paymentMethods:", paymentMethods);

    return NextResponse.json(createSuccessResponse({
      summary: {
        total_transactions: Number(summary.total_transactions) || 0,
        total_revenue: Number(summary.total_revenue) || 0,
        total_tax: Number(summary.total_tax) || 0,
        average_transaction: Number(summary.average_transaction) || 0,
      },
      dailySales: dailySales.map((d) => ({
        date: d.date,
        transactionCount: Number(d.transaction_count) || 0,
        totalSales: Number(d.total_sales) || 0,
        totalTax: Number(d.total_tax) || 0,
        averageSale: Number(d.average_sale) || 0,
      })),
      topProducts: topProducts.map((p) => ({
        name: p.name,
        sku: p.sku,
        totalQuantity: Number(p.total_quantity) || 0,
        totalRevenue: Number(p.total_revenue) || 0,
      })),
      paymentMethods: paymentMethods.map((pm) => ({
        method: pm.payment_method,
        transactionCount: Number(pm.transaction_count) || 0,
        totalAmount: Number(pm.total_amount) || 0,
      })),
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate)
      },
      locationId,
      generatedAt: new Date().toISOString(),
      generatedBy: accessControl.user.id
    }));
  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}