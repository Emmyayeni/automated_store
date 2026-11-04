import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesForecasts, transactions, transactionItems, products, users } from "@/lib/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
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
import { ValidationRules, createValidator } from "@/lib/standards/validation";

export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session
    const accessControl = await validateSession();
    if (!accessControl.isValid || !accessControl.user) {
      const errorResponse = createAuthErrorResponse(accessControl.error || "Authentication required");
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const daysParam = searchParams.get("days") || "30";

    // Validate days parameter using centralized validation
    const daysValidator = createValidator<string>('Days')
      .addRule(ValidationRules.number('Days'))
      .addRule(ValidationRules.minValue('Days', 1))
      .addRule(ValidationRules.maxValue('Days', 365));
    
    const daysValidation = daysValidator.validate(daysParam);
    if (!daysValidation.isValid) {
      throw new ValidationError(daysValidation.error!, 'days', daysParam, context);
    }
    
    const days = Number.parseInt(daysParam);

    // Build where clause
    const whereClauses = [
      eq(transactions.status, "completed"),
      gte(transactions.createdAt, sql`CURRENT_DATE - INTERVAL '90 days'`)
    ];

    if (locationId) {
      // Validate UUID format using centralized validation
      const uuidValidator = createValidator<string>('Location ID')
        .addRule(ValidationRules.custom(
          (value: string) => /^[0-9a-fA-F-]{36}$/.test(value),
          'Invalid location ID format'
        ));
      
      const locationValidation = uuidValidator.validate(locationId);
      if (!locationValidation.isValid) {
        throw new ValidationError(locationValidation.error!, 'locationId', locationId, context);
      }
      
      whereClauses.push(eq(users.locationId, locationId));
    }

    // Query using Drizzle's query builder
    const historicalData = await db
      .select({
        saleDate: sql`DATE(${transactions.createdAt})`.as("sale_date"),
        productId: transactionItems.productId,
        productName: products.name,
        totalQuantity: sql`SUM(${transactionItems.quantity})`.as("total_quantity"),
        totalRevenue: sql`SUM(${transactionItems.price} * ${transactionItems.quantity})`.as("total_revenue"),
      })
      .from(transactions)
      .innerJoin(transactionItems, eq(transactions.id, transactionItems.transactionId))
      .innerJoin(products, eq(transactionItems.productId, products.id))
      .where(and(...whereClauses))
      .groupBy(
        sql`DATE(${transactions.createdAt})`,
        transactionItems.productId,
        products.name
      )
      .orderBy(
        desc(sql`DATE(${transactions.createdAt})`),
        desc(sql`SUM(${transactionItems.quantity})`)
      );

    // Forecast logic
    const forecasts: any[] = [];
    const productSales = new Map();

    for (const sale of historicalData) {
      const productId = sale.productId;
      if (!productSales.has(productId)) {
        productSales.set(productId, {
          name: sale.productName,
          dailySales: [],
          totalRevenue: 0,
        });
      }
      productSales.get(productId).dailySales.push({
        date: sale.saleDate,
        quantity: Number.parseInt(String(sale.totalQuantity)),
        revenue: Number.parseFloat(String(sale.totalRevenue)),
      });
      productSales.get(productId).totalRevenue += Number.parseFloat(String(sale.totalRevenue));
    }

    for (const [productId, data] of productSales) {
      if (data.dailySales.length >= 7) {
        const recentSales = data.dailySales.slice(0, 7);
        const avgQuantity = recentSales.reduce((sum: number, sale: { quantity: number; revenue: number; date: string }) => sum + sale.quantity, 0) / 7;
        const avgRevenue = recentSales.reduce((sum: number, sale: { revenue: any; }) => sum + sale.revenue, 0) / 7;

        for (let i = 1; i <= days; i++) {
          const forecastDate = new Date();
          forecastDate.setDate(forecastDate.getDate() + i);

          const seasonalityFactor = 1 + 0.1 * Math.sin((i / 7) * Math.PI);
          const trendFactor = 1 + (i / 365) * 0.05;

          forecasts.push({
            productId,
            productName: data.name,
            forecastDate: forecastDate.toISOString().split("T")[0],
            predictedQuantity: Math.round(avgQuantity * seasonalityFactor * trendFactor),
            predictedRevenue: Number.parseFloat((avgRevenue * seasonalityFactor * trendFactor).toFixed(2)),
            confidenceScore: Math.max(0.6, 1 - (i / days) * 0.4),
            locationId: locationId || null,
          });
        }
      }
    }

    return NextResponse.json(createSuccessResponse({
      forecasts: forecasts.slice(0, 100),
      summary: {
        totalProducts: productSales.size,
        forecastDays: days,
        dataPoints: historicalData.length,
      },
      generatedAt: new Date().toISOString(),
      generatedBy: accessControl.user.id
    }));
  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session
    const accessControl = await validateSession();
    if (!accessControl.isValid || !accessControl.user) {
      const errorResponse = createAuthErrorResponse(accessControl.error || "Authentication required");
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { forecasts } = await request.json();

    if (!Array.isArray(forecasts)) {
      throw new ValidationError('Forecasts must be an array', 'forecasts', forecasts, context);
    }

    // Validate each forecast using centralized validation
    const uuidValidator = createValidator<string>('Location ID')
      .addRule(ValidationRules.custom(
        (value: string) => /^[0-9a-fA-F-]{36}$/.test(value),
        'Invalid location ID format'
      ));

    const validForecasts = [];
    for (const forecast of forecasts) {
      // Validate locationId as UUID if present
      if (forecast.locationId) {
        const locationValidation = uuidValidator.validate(forecast.locationId);
        if (!locationValidation.isValid) {
          continue; // skip invalid forecasts
        }
      }

      // Validate required fields
      if (!forecast.productId || !forecast.forecastDate) {
        continue; // skip incomplete forecasts
      }

      validForecasts.push(forecast);
    }

    // Save valid forecasts
    for (const forecast of validForecasts) {
      await db
        .insert(salesForecasts)
        .values({
          locationId: forecast.locationId || null,
          productId: forecast.productId,
          forecastDate: forecast.forecastDate,
          predictedQuantity: forecast.predictedQuantity,
          predictedRevenue: forecast.predictedRevenue,
          confidenceScore: forecast.confidenceScore,
          modelVersion: "v1.0",
        })
        .onConflictDoUpdate({
          target: [salesForecasts.locationId, salesForecasts.productId, salesForecasts.forecastDate],
          set: {
            predictedQuantity: forecast.predictedQuantity,
            predictedRevenue: forecast.predictedRevenue,
            confidenceScore: forecast.confidenceScore,
            modelVersion: "v1.0",
          },
        });
    }

    return NextResponse.json(createSuccessResponse({
      message: "Forecasts saved successfully",
      savedCount: validForecasts.length,
      skippedCount: forecasts.length - validForecasts.length
    }));
  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}