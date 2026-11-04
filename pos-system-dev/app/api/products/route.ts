import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, inventory, locations } from "@/lib/schema";
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

    if (!validation.user.businessId) {
      throw new AuthorizationError("User must be associated with a business", context);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const storeId = searchParams.get("storeId") || searchParams.get("locationId");
    const businessId = validation.user.businessId;
    const queryBusinessId = searchParams.get("businessId");

    // If businessId is provided in query, return ALL products for the business (across all locations)
    if (queryBusinessId) {
      let whereClauses = [eq(products.isActive, true), eq(products.businessId, queryBusinessId)];

      if (search) {
        const searchPattern = `%${search}%`;
        whereClauses.push(
          dsql`(${products.name} ILIKE ${searchPattern} OR ${products.sku} ILIKE ${searchPattern} OR ${products.barcode} = ${search})`
        );
      }

      if (category) {
        whereClauses.push(eq(products.category, category));
      }

      // Join inventory to get stock per product per location (aggregate stock if needed)
      const result = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          sku: products.sku,
          barcode: products.barcode,
          price: products.price,
          cost: inventory.costPrice,
          category: products.category,
          stockQuantity: inventory.quantity,
          minStockLevel: inventory.minStockLevel,
          maxStockLevel: inventory.maxStockLevel,
          isActive: products.isActive,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(and(...whereClauses))
        .orderBy(products.name);

      // Convert numeric fields to numbers and format prices
      const formattedResult = result.map((product: any) => ({
        ...product,
        price: formatPrice(typeof product.price === 'string' ? parseFloat(product.price) : product.price),
        cost: product.cost ? formatPrice(typeof product.cost === 'string' ? parseFloat(product.cost) : product.cost) : null,
      }));

      return NextResponse.json(createSuccessResponse(formattedResult));
    }

    // If store/location is provided, return products for that location
    if (storeId) {
      // Check that the location belongs to the business
      const locationCheck = await db
        .select({ id: locations.id })
        .from(locations)
        .where(and(eq(locations.id, storeId), eq(locations.businessId, businessId)));
        
      if (!locationCheck.length) {
        throw new AuthorizationError("Access denied to this location", context);
      }

      let whereClauses = [eq(products.isActive, true), eq(products.businessId, businessId)];

      if (search) {
        const searchPattern = `%${search}%`;
        whereClauses.push(
          dsql`(${products.name} ILIKE ${searchPattern} OR ${products.sku} ILIKE ${searchPattern} OR ${products.barcode} = ${search})`
        );
      }

      if (category) {
        whereClauses.push(eq(products.category, category));
      }

      const storeWhere = eq(inventory.locationId, storeId);
      const result = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          sku: products.sku,
          barcode: products.barcode,
          price: products.price,
          cost: inventory.costPrice,
          category: products.category,
          stockQuantity: inventory.quantity,
          minStockLevel: inventory.minStockLevel,
          maxStockLevel: inventory.maxStockLevel,
          isActive: products.isActive,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .innerJoin(inventory, eq(products.id, inventory.productId))
        .where(and(storeWhere, ...whereClauses))
        .orderBy(products.name);

      // Convert numeric fields to numbers and format prices
      const formattedResult = result.map((product: any) => ({
        ...product,
        price: formatPrice(typeof product.price === 'string' ? parseFloat(product.price) : product.price),
        cost: product.cost ? formatPrice(typeof product.cost === 'string' ? parseFloat(product.cost) : product.cost) : null,
      }));

      return NextResponse.json(createSuccessResponse(formattedResult));
    }

    // If neither, return empty array
    return NextResponse.json(createSuccessResponse([]));

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
      const barcodeValidation = validateBarcode(barcode);
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
        createdAt: new Date(),
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
      createdAt: new Date(),
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
        sellPrice: formatPrice(parseFloat(inventoryRecord.sellPrice)),
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