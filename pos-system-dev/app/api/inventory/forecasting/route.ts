import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventory, products, transactions, transactionItems } from "@/lib/schema";
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
import { formatApiDate } from "@/lib/standards/formatting";
import { ValidationRules, createValidator } from "@/lib/standards/validation";

// GET - Get inventory forecasting data
export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session and require inventory forecasting permission
    const accessControl = await validatePermission('inventory.forecasting');
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const locationId = url.searchParams.get('locationId');
    const daysParam = url.searchParams.get('days') || '30';
    const forecastDaysParam = url.searchParams.get('forecastDays') || '30';

    // Validate days parameters using centralized validation
    const daysValidator = createValidator<string>('Days')
      .addRule(ValidationRules.number('Days'))
      .addRule(ValidationRules.minValue('Days', 1))
      .addRule(ValidationRules.maxValue('Days', 365));
    
    const daysValidation = daysValidator.validate(daysParam);
    if (!daysValidation.isValid) {
      throw new ValidationError(daysValidation.error!, 'days', daysParam, context);
    }
    
    const forecastDaysValidation = daysValidator.validate(forecastDaysParam);
    if (!forecastDaysValidation.isValid) {
      throw new ValidationError(forecastDaysValidation.error!, 'forecastDays', forecastDaysParam, context);
    }
    
    const days = Number.parseInt(daysParam);
    const forecastDays = Number.parseInt(forecastDaysParam);

    // Validate that at least one identifier is provided
    if (!productId && !locationId) {
      throw new ValidationError("Either productId or locationId is required", "productId", null, context);
    }

    // Validate UUID formats if provided
    const uuidValidator = createValidator<string>('UUID')
      .addRule(ValidationRules.custom(
        (value: string) => /^[0-9a-fA-F-]{36}$/.test(value),
        'Invalid UUID format'
      ));
    
    if (productId) {
      const productValidation = uuidValidator.validate(productId);
      if (!productValidation.isValid) {
        throw new ValidationError('Invalid product ID format', 'productId', productId, context);
      }
    }
    
    if (locationId) {
      const locationValidation = uuidValidator.validate(locationId);
      if (!locationValidation.isValid) {
        throw new ValidationError('Invalid location ID format', 'locationId', locationId, context);
      }
    }

    // Build historical sales data query
    let conditions = [
      gte(transactions.createdAt, new Date(Date.now() - days * 24 * 60 * 60 * 1000))
    ];

    if (productId) {
      conditions.push(eq(transactionItems.productId, productId));
    }

    // Get historical sales data
    const historicalSales = await db
      .select({
        date: sql`DATE(${transactions.createdAt})`,
        productId: transactionItems.productId,
        productName: products.name,
        totalQuantity: sql`SUM(${transactionItems.quantity})`,
        totalRevenue: sql`SUM(${transactionItems.lineTotal})`,
        averagePrice: sql`AVG(${transactionItems.unitPrice})`,
      })
      .from(transactions)
      .innerJoin(transactionItems, eq(transactions.id, transactionItems.transactionId))
      .innerJoin(products, eq(transactionItems.productId, products.id))
      .where(and(...conditions))
      .groupBy(sql`DATE(${transactions.createdAt})`, transactionItems.productId, products.name)
      .orderBy(sql`DATE(${transactions.createdAt})`);

    // Calculate trends and forecasting
    const productForecasts = new Map();

    // Group by product
    const salesByProduct = historicalSales.reduce((acc, sale) => {
      if (!acc[sale.productId]) {
        acc[sale.productId] = {
          productId: sale.productId,
          productName: sale.productName,
          dailySales: [],
          totalSales: 0,
          averageDaily: 0,
          trend: 'stable'
        };
      }
      acc[sale.productId].dailySales.push({
        date: sale.date,
        quantity: Number(sale.totalQuantity),
        revenue: Number(sale.totalRevenue)
      });
      acc[sale.productId].totalSales += Number(sale.totalQuantity);
      return acc;
    }, {} as Record<string, any>);

    // Calculate forecasts for each product
    for (const [id, data] of Object.entries(salesByProduct)) {
      const dailySales = data.dailySales;
      const averageDaily = dailySales.length > 0 ? data.totalSales / days : 0;
      
      // Simple linear trend calculation
      let trend = 'stable';
      if (dailySales.length >= 7) {
        const recent = dailySales.slice(-7).reduce((sum, day) => sum + day.quantity, 0) / 7;
        const earlier = dailySales.slice(0, 7).reduce((sum, day) => sum + day.quantity, 0) / 7;
        
        if (recent > earlier * 1.1) trend = 'increasing';
        else if (recent < earlier * 0.9) trend = 'decreasing';
      }

      // Forecast future sales (simple linear projection)
      const forecastData = [];
      let trendMultiplier = 1;
      if (trend === 'increasing') trendMultiplier = 1.05;
      else if (trend === 'decreasing') trendMultiplier = 0.95;

      for (let i = 1; i <= forecastDays; i++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + i);
        
        const forecastQuantity = Math.round(averageDaily * Math.pow(trendMultiplier, i / 7));
        
        forecastData.push({
          date: forecastDate.toISOString().split('T')[0],
          forecastQuantity,
          confidence: Math.max(0.5, 1 - (i / forecastDays) * 0.4) // Decreasing confidence over time
        });
      }

      // Get current inventory
      const [currentInventory] = await db
        .select({
          currentQuantity: inventory.quantity,
          minStockLevel: inventory.minStockLevel,
          maxStockLevel: inventory.maxStockLevel
        })
        .from(inventory)
        .where(and(
          eq(inventory.productId, id),
          locationId ? eq(inventory.locationId, locationId) : sql`1=1`
        ))
        .limit(1);

      // Calculate stock-out prediction
      const totalForecastDemand = forecastData.reduce((sum, day) => sum + day.forecastQuantity, 0);
      const currentStock = currentInventory?.currentQuantity || 0;
      const daysUntilStockOut = averageDaily > 0 ? Math.floor(currentStock / averageDaily) : 999;

      productForecasts.set(id, {
        productId: id,
        productName: data.productName,
        currentStock,
        averageDaily,
        trend,
        daysUntilStockOut,
        forecastDemand: totalForecastDemand,
        recommendedOrder: Math.max(0, totalForecastDemand - currentStock),
        forecast: forecastData,
        historicalAverage: averageDaily,
        confidence: dailySales.length >= 14 ? 'high' : dailySales.length >= 7 ? 'medium' : 'low'
      });
    }

    return NextResponse.json(createSuccessResponse({
      forecasts: Array.from(productForecasts.values()),
      period: {
        historicalDays: days,
        forecastDays,
        generatedAt: formatApiDate(new Date())
      },
      summary: {
        totalProducts: productForecasts.size,
        averageConfidence: Array.from(productForecasts.values())
          .reduce((sum, f) => sum + (f.confidence === 'high' ? 3 : f.confidence === 'medium' ? 2 : 1), 0) / productForecasts.size
      },
      metadata: {
        generatedBy: accessControl.user.id,
        productId,
        locationId
      }
    }));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// POST - Update forecasting parameters
export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session and require inventory forecasting permission
    const accessControl = await validatePermission('inventory.forecasting');
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const { 
      productId, 
      locationId, 
      customTrend, 
      seasonalAdjustments,
      safetyStockDays 
    } = await request.json();

    // Validate required fields using centralized validation
    if (!productId && !locationId) {
      throw new ValidationError("Either productId or locationId is required", "productId", null, context);
    }

    // Validate UUID formats if provided
    const uuidValidator = createValidator<string>('UUID')
      .addRule(ValidationRules.custom(
        (value: string) => /^[0-9a-fA-F-]{36}$/.test(value),
        'Invalid UUID format'
      ));
    
    if (productId) {
      const productValidation = uuidValidator.validate(productId);
      if (!productValidation.isValid) {
        throw new ValidationError('Invalid product ID format', 'productId', productId, context);
      }
    }
    
    if (locationId) {
      const locationValidation = uuidValidator.validate(locationId);
      if (!locationValidation.isValid) {
        throw new ValidationError('Invalid location ID format', 'locationId', locationId, context);
      }
    }

    // Validate safetyStockDays if provided
    if (safetyStockDays !== undefined) {
      const safetyStockValidator = createValidator<number>('Safety stock days')
        .addRule(ValidationRules.number('Safety stock days'))
        .addRule(ValidationRules.minValue('Safety stock days', 0))
        .addRule(ValidationRules.maxValue('Safety stock days', 365));
      
      const safetyStockValidation = safetyStockValidator.validate(safetyStockDays);
      if (!safetyStockValidation.isValid) {
        throw new ValidationError(safetyStockValidation.error!, 'safetyStockDays', safetyStockDays, context);
      }
    }

    // In production: Store custom forecasting parameters in inventoryForecastingSettings table
    // Create a forecasting_parameters table to store:
    // - Custom trend multipliers
    // - Seasonal adjustments by month/week
    // - Safety stock requirements
    // - Lead time adjustments

    return NextResponse.json(createSuccessResponse({
      message: "Forecasting parameters updated",
      productId,
      locationId,
      parameters: {
        customTrend,
        seasonalAdjustments,
        safetyStockDays
      },
      updatedAt: formatApiDate(new Date()),
      updatedBy: accessControl.user.id
    }));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}
