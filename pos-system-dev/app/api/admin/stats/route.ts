import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, customers, products, locations } from "@/lib/schema";
import { eq, inArray, sql } from "drizzle-orm";
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

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    
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

    const locationRows = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.businessId, businessId));
    const locationIds = locationRows.map((row) => row.id);

    if (locationIds.length === 0) {
      return NextResponse.json(createSuccessResponse({
        revenue: 0,
        orders: 0,
        customers: 0,
        products: 0,
        metadata: {
          businessId,
          locationCount: 0,
          generatedAt: new Date().toISOString(),
          generatedBy: accessControl.user.id
        }
      }));
    }

    const [{ revenue = 0 } = {}] = await db
      .select({ revenue: sql<number>`COALESCE(SUM(${transactions.total}), 0)` })
      .from(transactions)
      .where(inArray(transactions.locationId, locationIds));

    const [{ orders = 0 } = {}] = await db
      .select({ orders: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(inArray(transactions.locationId, locationIds));

    const [{ customers: customersCount = 0 } = {}] = await db
      .select({ customers: sql<number>`COUNT(*)` })
      .from(customers)
      .where(eq(customers.businessId, businessId));

    const [{ products: productsCount = 0 } = {}] = await db
      .select({ products: sql<number>`COUNT(*)` })
      .from(products)
      .where(eq(products.businessId, businessId));

    return NextResponse.json(createSuccessResponse({
      revenue,
      orders,
      customers: customersCount,
      products: productsCount,
      metadata: {
        businessId,
        locationCount: locationIds.length,
        generatedAt: new Date().toISOString(),
        generatedBy: accessControl.user.id
      }
    }));
  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}