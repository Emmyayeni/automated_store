import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, inventory, locations } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateSKU, validateBarcode } from "@/lib/sku-generator";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to register products
    const userRole = session.user.role;
    if (userRole !== 'admin' && userRole !== 'manager') {
      return NextResponse.json({ 
        error: "Forbidden - Only managers and admins can register new products" 
      }, { status: 403 });
    }

    const body = await request.json();

    if (!body.barcode || !body.locationId) {
      return NextResponse.json(
        { error: "Missing required fields: barcode, locationId" },
        { status: 400 }
      );
    }

    // Check that the location belongs to the business
    const locationCheck = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, body.locationId), eq(locations.businessId, session.user.businessId)));
    if (!locationCheck.length) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate and format barcode
    const validation = validateBarcode(body.barcode);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid barcode format" },
        { status: 400 }
      );
    }
    const formattedBarcode = validation.formatted;

    // Check if product already exists with this barcode
    const existingProduct = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        price: products.price,
        category: products.category,
        stockQuantity: inventory.quantity,
      })
      .from(products)
      .leftJoin(
        inventory,
        and(
          eq(products.id, inventory.productId),
          eq(inventory.locationId, body.locationId)
        )
      )
      .where(
        and(
          eq(products.barcode, formattedBarcode),
          eq(products.businessId, session.user.businessId),
          eq(products.isActive, true)
        )
      )
      .limit(1);

    if (existingProduct.length > 0) {
      const product = existingProduct[0];
      return NextResponse.json({
        exists: true,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: typeof product.price === "string" ? parseFloat(product.price) : Number(product.price),
          category: product.category,
          stockQuantity: product.stockQuantity ?? 0,
        },
        message: "Product already exists in your inventory"
      });
    }

    // Product doesn't exist, create a new one with the scanned barcode
    const productName = body.name || `Scanned Product ${formattedBarcode.slice(-4)}`;
    const category = body.category || "General";
    const price = body.price || 0;

    // Use provided SKU or auto-generate if not provided
    let sku = body.sku;
    if (!sku || sku.trim() === '') {
      sku = await generateSKU({
        businessId: session.user.businessId,
        category: category,
        productName: productName
      });
    } else {
      // Check for duplicate SKU if manually provided
      const existingSKU = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.sku, sku), eq(products.businessId, session.user.businessId)));
      if (existingSKU.length > 0) {
        return NextResponse.json(
          { error: "A product with this SKU already exists." },
          { status: 400 }
        );
      }
    }

    // Create the new product
    const [newProduct] = await db
      .insert(products)
      .values({
        businessId: session.user.businessId,
        name: productName,
        description: body.description || `Product registered via barcode scan: ${formattedBarcode}`,
        imageUrl: body.imageUrl || "",
        price: price,
        category: category,
        barcode: formattedBarcode,
        sku: sku,
        isActive: true,
      })
      .returning();

    // Add to inventory for this location
    await db.insert(inventory).values({
      productId: newProduct.id,
      locationId: body.locationId,
      quantity: body.stockQuantity || 0,
      minStockLevel: body.minStockLevel || 10,
      maxStockLevel: body.maxStockLevel || 100,
      costPrice: body.cost || null,
      sellPrice: price,
    });

    return NextResponse.json({
      exists: false,
      product: {
        id: newProduct.id,
        name: newProduct.name,
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        price: typeof newProduct.price === "string" ? parseFloat(newProduct.price) : Number(newProduct.price),
        category: newProduct.category,
        stockQuantity: body.stockQuantity || 0,
      },
      message: "New product registered successfully"
    });

  } catch (error) {
    console.error("Error registering product:", error);
    return NextResponse.json({ error: "Failed to register product" }, { status: 500 });
  }
}
