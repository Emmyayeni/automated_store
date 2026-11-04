import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, inventory, categories } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { barcode, locationId } = await request.json();

    // Validate barcode and locationId
    if (
      !barcode ||
      typeof barcode !== "string" ||
      barcode.trim() === "" ||
      !locationId ||
      typeof locationId !== "string" ||
      locationId.trim() === ""
    ) {
      return NextResponse.json({ error: "Invalid barcode or locationId" }, { status: 400 });
    }

    // Query product by barcode and locationId, include inventory and category
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        price: products.price,
        stock: inventory.quantity,
        category: categories.name,
      })
      .from(products)
      .leftJoin(
        inventory,
        and(
          eq(products.id, inventory.productId),
          eq(inventory.locationId, locationId)
        )
      )
      .leftJoin(categories, eq(products.category, categories.name))
      .where(
        and(
          eq(products.barcode, barcode),
          eq(products.isActive, true)
        )
      );

    const product = result[0];

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      price: typeof product.price === "string" ? parseFloat(product.price) : Number(product.price),
      stock: product.stock ?? 0,
      category: product.category,
    });
  } catch (error) {
    console.error("Error processing barcode scan:", error);
    return NextResponse.json({ error: "Failed to process barcode scan" }, { status: 500 });
  }
}