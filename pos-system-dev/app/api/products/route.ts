import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, inventory, locations, businesses } from "@/lib/schema";
import { eq, and, sql as dsql } from "drizzle-orm";
import { generateSKU, generateBarcode, validateBarcode } from "@/lib/sku-generator";
import { 
  createSuccessResponse, 
  createValidationErrorResponse,
  createNotFoundResponse 
} from "@/lib/standards/api-responses";
import { 
  handleApiError, 
  createErrorContext, 
  ValidationError,
  BusinessLogicError,
  NotFoundError,
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
import { normalizeRole } from "@/lib/roles";
import { auth } from "@/lib/auth";

// GET: Return products by businessId or by location/store
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
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const rawStoreId = searchParams.get("storeId") || searchParams.get("locationId");
    const queryBusinessId = searchParams.get("businessId");

    // Resolve businessId safely from session, query, or fallback to first business
    let businessId = queryBusinessId || validation.user.businessId;
    if (!businessId) {
      const [firstBiz] = await db.select({ id: businesses.id }).from(businesses).limit(1);
      businessId = firstBiz?.id;
    }

    if (!businessId) {
      return NextResponse.json(createSuccessResponse([]));
    }

    // Sanitize storeId / locationId
    const validStoreId =
      rawStoreId &&
      rawStoreId !== "undefined" &&
      rawStoreId !== "null" &&
      rawStoreId.trim() !== ""
        ? rawStoreId.trim()
        : null;

    let baseWhereClauses = [eq(products.isActive, true)];
    if (businessId) {
      baseWhereClauses.push(eq(products.businessId, businessId));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      baseWhereClauses.push(
        dsql`(${products.name} ILIKE ${searchPattern} OR ${products.sku} ILIKE ${searchPattern} OR ${products.barcode} = ${search})`
      );
    }

    if (category && category !== "all" && category !== "ALL") {
      baseWhereClauses.push(eq(products.category, category));
    }

    // CASE 1: Query for a specific store / location
    if (validStoreId) {
      const result = await db
        .select({
          id: products.id,
          businessId: products.businessId,
          name: products.name,
          description: products.description,
          sku: products.sku,
          barcode: products.barcode,
          price: products.price,
          cost: inventory.costPrice,
          category: products.category,
          stock: inventory.quantity,
          stockQuantity: inventory.quantity,
          minStockLevel: inventory.minStockLevel,
          maxStockLevel: inventory.maxStockLevel,
          isActive: products.isActive,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .leftJoin(
          inventory,
          and(eq(products.id, inventory.productId), eq(inventory.locationId, validStoreId))
        )
        .where(and(...baseWhereClauses))
        .orderBy(products.name);

      const formattedResult = result.map((product: any) => {
        const rawPrice = typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price || 0);
        const numPrice = isNaN(rawPrice) ? 0 : rawPrice;
        const rawCost = product.cost ? (typeof product.cost === 'string' ? parseFloat(product.cost) : Number(product.cost || 0)) : null;
        const numCost = rawCost !== null && !isNaN(rawCost) ? rawCost : null;
        const stockVal = typeof product.stock === 'number' && !isNaN(product.stock) ? product.stock : 0;

        return {
          ...product,
          price: numPrice,
          rawPrice: numPrice,
          cost: numCost,
          stock: stockVal,
          stockQuantity: stockVal,
          formattedPrice: formatPrice(numPrice),
          formattedCost: numCost !== null ? formatPrice(numCost) : null,
        };
      });

      return NextResponse.json(createSuccessResponse(formattedResult));
    }

    // CASE 2: Query for all products in business (when storeId is not provided)
    // Query product catalog and aggregate stock across all locations
    const result = await db
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        price: products.price,
        cost: products.costPrice,
        category: products.category,
        stock: dsql<number>`COALESCE(SUM(${inventory.quantity}), 0)`,
        stockQuantity: dsql<number>`COALESCE(SUM(${inventory.quantity}), 0)`,
        minStockLevel: products.reorderLevel,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .where(and(...baseWhereClauses))
      .groupBy(products.id)
      .orderBy(products.name);

    const formattedResult = result.map((product: any) => {
      const rawPrice = typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price || 0);
      const numPrice = isNaN(rawPrice) ? 0 : rawPrice;
      const rawCost = product.cost ? (typeof product.cost === 'string' ? parseFloat(product.cost) : Number(product.cost || 0)) : null;
      const numCost = rawCost !== null && !isNaN(rawCost) ? rawCost : null;
      const stockVal = typeof product.stock === 'number' && !isNaN(product.stock) ? product.stock : Number(product.stock || 0);

      return {
        ...product,
        price: numPrice,
        rawPrice: numPrice,
        cost: numCost,
        stock: stockVal,
        stockQuantity: stockVal,
        formattedPrice: formatPrice(numPrice),
        formattedCost: numCost !== null ? formatPrice(numCost) : null,
      };
    });

    return NextResponse.json(createSuccessResponse(formattedResult));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// POST: Create a new product (restricted by businessId)
export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    if (!validation.user.businessId) {
      throw new AuthorizationError("User must be associated with a business", context);
    }

    // Check if user has permission to add products using normalized roles
    const roleCheck = await validateRole(["ADMIN", "MANAGER"]);
    
    if (!roleCheck.hasAccess) {
      const errorResponse = createAuthorizationErrorFromResult(roleCheck);
      return NextResponse.json(errorResponse, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid JSON in request body", "body");
    }

    // Validate required fields
    const validationErrors = [];
    
    if (!body.name) {
      validationErrors.push({
        field: "name",
        message: VALIDATION_MESSAGES.REQUIRED("Product name"),
        value: body.name
      });
    }
    
    if (!body.price || body.price <= 0) {
      validationErrors.push({
        field: "price",
        message: VALIDATION_MESSAGES.POSITIVE_NUMBER("Price"),
        value: body.price
      });
    }
    
    if (!body.stockQuantity || body.stockQuantity < 0) {
      validationErrors.push({
        field: "stockQuantity",
        message: "Stock quantity must be a non-negative number",
        value: body.stockQuantity
      });
    }
    
    if (!body.locationId) {
      validationErrors.push({
        field: "locationId",
        message: VALIDATION_MESSAGES.REQUIRED("Location ID"),
        value: body.locationId
      });
    }

    if (validationErrors.length > 0) {
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Check that the location belongs to the business
    const locationCheck = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, body.locationId), eq(locations.businessId, validation.user.businessId)));
      
    if (!locationCheck.length) {
      throw new AuthorizationError("Access denied to this location", context);
    }

    // Auto-generate SKU if not provided
    let sku = body.sku;
    if (!sku || sku.trim() === '') {
      sku = await generateSKU({
        businessId: validation.user.businessId,
        category: body.category,
        productName: body.name
      });
    } else {
      // Check for duplicate SKU if manually provided
      const existingSKU = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.sku, sku), eq(products.businessId, validation.user.businessId)));
        
      if (existingSKU.length > 0) {
        throw new BusinessLogicError("A product with this SKU already exists", context);
      }
    }

    // Handle barcode
    let barcode = body.barcode;
    if (barcode) {
      // Validate and format existing barcode
      const barcodeValidation = validateBarcode(barcode ?? "");
      if (!barcodeValidation.isValid) {
        const validationErrors = [{
          field: "barcode",
          message: "Invalid barcode format",
          value: barcode
        }];
        const response = createValidationErrorResponse(validationErrors);
        return NextResponse.json(response, { status: 400 });
      }
      barcode = barcodeValidation.formatted;

      // Check for duplicate barcode
      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.barcode, barcode), eq(products.businessId, validation.user.businessId)));
        
      if (existing.length > 0) {
        throw new BusinessLogicError("A product with this barcode already exists", context);
      }
    } else if (body.autoGenerateBarcode) {
      // Auto-generate barcode if requested
      barcode = generateBarcode(validation.user.businessId, body.name);
      
      // Ensure generated barcode is unique
      let attempts = 0;
      while (attempts < 5) {
        const existing = await db
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.barcode, barcode), eq(products.businessId, validation.user.businessId)));
        
        if (existing.length === 0) break;
        
        barcode = generateBarcode(validation.user.businessId, body.name + attempts);
        attempts++;
      }
    }

    // Create product
    const [product] = await db
      .insert(products)
      .values({
        businessId: validation.user.businessId,
        name: body.name,
        description: body.description ?? "",
        imageUrl: body.imageUrl ?? "",
        price: body.price.toString(),
        category: body.category ?? "",
        barcode: barcode ?? "",
        sku: sku,
        isActive: true,
        updatedAt: new Date(),
      })
      .returning();

    // Add to inventory for this location
    const [inventoryRecord] = await db.insert(inventory).values({
      productId: product.id,
      locationId: body.locationId,
      quantity: body.stockQuantity,
      minStockLevel: body.minStockLevel ?? 10,
      maxStockLevel: body.maxStockLevel ?? 100,
      costPrice: body.cost ? body.cost.toString() : null,
      sellPrice: body.price.toString(),
      updatedAt: new Date(),
    }).returning();

    const responseData = {
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        price: formatPrice(parseFloat(product.price)),
        category: product.category,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        createdAt: product.createdAt,
      },
      inventory: {
        id: inventoryRecord.id,
        locationId: inventoryRecord.locationId,
        quantity: inventoryRecord.quantity,
        minStockLevel: inventoryRecord.minStockLevel,
        maxStockLevel: inventoryRecord.maxStockLevel,
        costPrice: inventoryRecord.costPrice ? formatPrice(parseFloat(inventoryRecord.costPrice)) : null,
        sellPrice: inventoryRecord.sellPrice ? formatPrice(parseFloat(inventoryRecord.sellPrice)) : null,
      },
      message: "Product created successfully"
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 201 });

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// PUT: Edit a product (restricted by businessId)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.id || !body.locationId) {
      return NextResponse.json({ error: "Missing product id or locationId" }, { status: 400 });
    }

    // Check that the location belongs to the business
    const locationCheck = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, body.locationId), eq(locations.businessId, session.user.businessId)));
    if (!locationCheck.length) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update product
    const [updated] = await db
      .update(products)
      .set({
        name: body.name,
        description: body.description ?? "",
        imageUrl: body.imageUrl ?? "",
        price: body.price,
        category: body.category ?? "",
        barcode: body.barcode ?? "",
        sku: body.sku,
        isActive: body.isActive ?? true,
      })
      .where(and(eq(products.id, body.id), eq(products.businessId, session.user.businessId)))
      .returning();

    // Optionally update inventory
    if (body.stockQuantity !== undefined) {
      await db
        .update(inventory)
        .set({ quantity: body.stockQuantity })
        .where(
          and(
            eq(inventory.productId, body.id),
            eq(inventory.locationId, body.locationId)
          )
        );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE: Remove a product from a location's inventory (soft delete or hard delete as needed)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing product id" }, { status: 400 });
    }

    // Soft delete: set isActive to false
    const [deleted] = await db
      .update(products)
      .set({ isActive: false })
      .where(and(eq(products.id, id), eq(products.businessId, session.user.businessId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Product not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}