import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventory, products, inventoryAdjustmentLogs, users } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { 
  adjustInventoryWithLog, 
  canAdjustInventory, 
  validateAdjustmentInput,
  getInventoryAdjustmentHistory 
} from "@/lib/inventory-utils";
import { 
  createSuccessResponse, 
  createValidationErrorResponse 
} from "@/lib/standards/api-responses";
import { 
  handleApiError, 
  createErrorContext, 
  ValidationError,
  AuthorizationError 
} from "@/lib/standards/error-handling";
import { 
  validateSession, 
  validateRole,
  createAuthenticationErrorResponse,
  createAuthorizationErrorFromResult 
} from "@/lib/standards/auth-patterns";
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages";
import { formatPrice } from "@/lib/price-utils";
import { formatDisplayDateTime } from "@/lib/standards/formatting";
import { normalizeRole } from "@/lib/roles";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

// UUID v4 validator
const isUuid = (v: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

// GET /api/inventory/adjustments?locationId=...&productId=...&type=history
export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");

    if (type === "history") {
      // Return adjustment history
      const history = await getInventoryAdjustmentHistory(
        locationId || undefined,
        productId || undefined
      );

      // Join with user and product information
      const enrichedHistory = await db
        .select({
          id: inventoryAdjustmentLogs.id,
          locationId: inventoryAdjustmentLogs.locationId,
          productId: inventoryAdjustmentLogs.productId,
          productName: products.name,
          productSku: products.sku,
          adjustmentType: inventoryAdjustmentLogs.adjustmentType,
          previousQuantity: inventoryAdjustmentLogs.previousQuantity,
          adjustmentQuantity: inventoryAdjustmentLogs.adjustmentQuantity,
          newQuantity: inventoryAdjustmentLogs.newQuantity,
          reason: inventoryAdjustmentLogs.reason,
          adjustedBy: inventoryAdjustmentLogs.adjustedBy,
          adjustedByName: users.name,
          referenceId: inventoryAdjustmentLogs.referenceId,
          referenceType: inventoryAdjustmentLogs.referenceType,
          notes: inventoryAdjustmentLogs.notes,
          createdAt: inventoryAdjustmentLogs.createdAt,
        })
        .from(inventoryAdjustmentLogs)
        .innerJoin(products, eq(inventoryAdjustmentLogs.productId, products.id))
        .innerJoin(users, eq(inventoryAdjustmentLogs.adjustedBy, users.id))
        .where(
          locationId && productId
            ? and(
                eq(inventoryAdjustmentLogs.locationId, locationId),
                eq(inventoryAdjustmentLogs.productId, productId)
              )
            : locationId
            ? eq(inventoryAdjustmentLogs.locationId, locationId)
            : productId
            ? eq(inventoryAdjustmentLogs.productId, productId)
            : undefined
        )
        .orderBy(desc(inventoryAdjustmentLogs.createdAt))
        .limit(100);

      // Format the history with standardized formatting
      const formattedHistory = enrichedHistory.map((entry: any) => ({
        ...entry,
        adjustedAt: formatDisplayDateTime(entry.createdAt),
      }));

      return NextResponse.json(createSuccessResponse(formattedHistory));
    }

    // Default: Return current inventory for adjustment
    if (!locationId || !isUuid(locationId)) {
      const validationErrors = [{
        field: "locationId",
        message: "Valid location ID is required",
        value: locationId
      }];
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Join inventory and products for this location
    const result = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        productName: products.name,
        sku: products.sku,
        quantity: inventory.quantity,
        minStockLevel: inventory.minStockLevel,
        maxStockLevel: inventory.maxStockLevel,
        costPrice: inventory.costPrice,
        sellPrice: inventory.sellPrice,
        updatedAt: inventory.updatedAt,
        category: products.category,
        description: products.description,
        isActive: products.isActive,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(and(
        eq(inventory.locationId, locationId),
        eq(products.isActive, true)
      ))
      .orderBy(desc(inventory.updatedAt));

    // Format the response with standardized formatting
    const formattedResult = result.map((item: any) => ({
      ...item,
      costPrice: item.costPrice ? formatPrice(typeof item.costPrice === 'string' ? parseFloat(item.costPrice) : item.costPrice) : null,
      sellPrice: formatPrice(typeof item.sellPrice === 'string' ? parseFloat(item.sellPrice) : item.sellPrice),
      lastUpdated: formatDisplayDateTime(item.updatedAt),
      stockStatus: item.quantity <= item.minStockLevel ? 'low' : item.quantity >= item.maxStockLevel ? 'high' : 'normal',
    }));

    return NextResponse.json(createSuccessResponse(formattedResult));

  } catch (error: any) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// POST /api/inventory/adjustments
// Adjust inventory with proper logging and permission checks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user permissions
    if (!canAdjustInventory(session.user.role || "")) {
      return NextResponse.json(
        { error: "Insufficient permissions. Only managers and admins can adjust inventory." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      locationId, 
      productId, 
      adjustmentQuantity, 
      adjustmentType = 'manual',
      reason,
      notes,
      referenceId,
      referenceType
    } = body;

    // For managers, verify they can only adjust inventory in their assigned location
    const upperRole = (session.user.role || "").toUpperCase();
    if (upperRole === 'MANAGER' || upperRole === 'BRANCH_MANAGER') {
      if (!session.user.locationId) {
        return NextResponse.json(
          { error: "Manager must be assigned to a location to adjust inventory." },
          { status: 403 }
        );
      }
      
      if (session.user.locationId !== locationId) {
        return NextResponse.json(
          { error: "Managers can only adjust inventory in their assigned location." },
          { status: 403 }
        );
      }
    }

    // Validate input
    const adjustmentInput = {
      locationId,
      productId,
      adjustmentType,
      adjustmentQuantity,
      reason,
      adjustedBy: session.user.id,
      referenceId,
      referenceType,
      notes,
    };

    const validationErrors = validateAdjustmentInput(adjustmentInput);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // Perform adjustment with logging
    const result = await adjustInventoryWithLog(adjustmentInput);

    // Get updated inventory with product details
    const [updatedInventoryWithProduct] = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        productName: products.name,
        sku: products.sku,
        quantity: inventory.quantity,
        minStockLevel: inventory.minStockLevel,
        maxStockLevel: inventory.maxStockLevel,
        costPrice: inventory.costPrice,
        sellPrice: inventory.sellPrice,
        updatedAt: inventory.updatedAt,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(and(
        eq(inventory.locationId, locationId),
        eq(inventory.productId, productId)
      ));

    return NextResponse.json({
      inventory: updatedInventoryWithProduct,
      adjustmentLog: result.log,
      message: `Successfully adjusted inventory. ${adjustmentQuantity > 0 ? 'Added' : 'Removed'} ${Math.abs(adjustmentQuantity)} units.`
    });

  } catch (error: any) {
    console.error("Error in POST /inventory/adjustments:", error);
    return NextResponse.json(
      { error: "Failed to adjust inventory", details: error?.message },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/adjustments
// Bulk inventory adjustments
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user permissions
    if (!canAdjustInventory(session.user.role || "")) {
      return NextResponse.json(
        { error: "Insufficient permissions. Only managers and admins can adjust inventory." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { adjustments, globalReason, globalAdjustmentType = 'manual' } = body;

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json(
        { error: "Adjustments array is required and cannot be empty" },
        { status: 400 }
      );
    }

    // For managers, verify all adjustments are for their assigned location
    const upperRole = (session.user.role || "").toUpperCase();
    if (upperRole === 'MANAGER' || upperRole === 'BRANCH_MANAGER') {
      if (!session.user.locationId) {
        return NextResponse.json(
          { error: "Manager must be assigned to a location to adjust inventory." },
          { status: 403 }
        );
      }
      
      const invalidAdjustments = adjustments.filter(adj => adj.locationId !== session.user.locationId);
      if (invalidAdjustments.length > 0) {
        return NextResponse.json(
          { error: "Managers can only adjust inventory in their assigned location." },
          { status: 403 }
        );
      }
    }

    // Validate all adjustments
    const validationErrors: string[] = [];
    const processedAdjustments = adjustments.map((adj, index) => {
      const adjustmentInput = {
        locationId: adj.locationId,
        productId: adj.productId,
        adjustmentType: adj.adjustmentType || globalAdjustmentType,
        adjustmentQuantity: adj.adjustmentQuantity,
        reason: adj.reason || globalReason,
        adjustedBy: session.user.id,
        referenceId: adj.referenceId,
        referenceType: adj.referenceType,
        notes: adj.notes,
      };

      const errors = validateAdjustmentInput(adjustmentInput);
      if (errors.length > 0) {
        validationErrors.push(`Adjustment ${index + 1}: ${errors.join(', ')}`);
      }

      return adjustmentInput;
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // Process all adjustments
    const results = [];
    for (const adjustment of processedAdjustments) {
      try {
        const result = await adjustInventoryWithLog(adjustment);
        results.push({
          success: true,
          productId: adjustment.productId,
          locationId: adjustment.locationId,
          result,
        });
      } catch (error: any) {
        results.push({
          success: false,
          productId: adjustment.productId,
          locationId: adjustment.locationId,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Processed ${results.length} adjustments. ${successCount} successful, ${failureCount} failed.`,
      results,
      summary: { total: results.length, successful: successCount, failed: failureCount }
    });

  } catch (error: any) {
    console.error("Error in PUT /inventory/adjustments:", error);
    return NextResponse.json(
      { error: "Failed to process bulk adjustments", details: error?.message },
      { status: 500 }
    );
  }
}