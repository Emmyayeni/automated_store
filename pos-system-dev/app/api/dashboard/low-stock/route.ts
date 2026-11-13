import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { inventory, products } from "@/lib/schema"
import { and, eq, lte } from "drizzle-orm"
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

export async function GET(req: NextRequest) {
  try {
    const context = createErrorContext(req);
    
    // Validate session and require dashboard permission
    const accessControl = await validatePermission('view_dashboard');
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get("locationId")

    // Validate required location ID
    if (!locationId) {
      throw new ValidationError("Location ID is required", "locationId", locationId, context);
    }

    // Validate location ID format
    const uuidValidator = createValidator<string>('Location ID')
      .addRule(ValidationRules.custom(
        (value: string) => /^[0-9a-fA-F-]{36}$/.test(value),
        'Invalid location ID format'
      ));
    
    const locationValidation = uuidValidator.validate(locationId);
    if (!locationValidation.isValid) {
      throw new ValidationError(locationValidation.error!, 'locationId', locationId, context);
    }

    // Get low stock items for this location
    const items = await db
      .select({
        name: products.name,
        quantity: inventory.quantity,
        minStockLevel: inventory.minStockLevel,
        unit: products.category, // You may want to use a real unit field if available
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(and(eq(inventory.locationId, locationId), lte(inventory.quantity, inventory.minStockLevel)))
      .orderBy(inventory.quantity)

    // Format for dashboard
    const result = items.map(item => ({
      name: item.name,
      amount: `${item.quantity} left${item.unit ? ` (${item.unit})` : ""}`,
      quantity: item.quantity,
      minStockLevel: item.minStockLevel,
    }))

    return NextResponse.json(createSuccessResponse({
      lowStockItems: result,
      metadata: {
        locationId,
        generatedAt: formatApiDate(new Date()),
        generatedBy: accessControl.user.id,
        itemCount: result.length,
        alertLevel: result.length > 10 ? 'high' : result.length > 5 ? 'medium' : 'low'
      }
    }));

  } catch (error) {
    const context = createErrorContext(req);
    return handleApiError(error, context);
  }
}