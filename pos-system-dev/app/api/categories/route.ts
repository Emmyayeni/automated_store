import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, businesses, products } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

// GET: Fetch all categories with product count
export async function GET() {
  try {
    const allCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        businessId: categories.businessId,
        createdAt: categories.createdAt,
      })
      .from(categories)
      .orderBy(categories.name);

    // Get product count per category
    const productCounts = await db
      .select({
        category: products.category,
        count: sql<number>`count(*)::int`,
      })
      .from(products)
      .groupBy(products.category);

    const countMap = new Map<string, number>();
    for (const pc of productCounts) {
      if (pc.category) {
        countMap.set(pc.category.toLowerCase(), pc.count);
      }
    }

    const categoriesWithCount = allCategories.map((cat) => ({
      ...cat,
      productCount: countMap.get(cat.name.toLowerCase()) || 0,
    }));

    return NextResponse.json(categoriesWithCount);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a new category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    // Determine business ID
    let businessId = body.businessId;
    if (!businessId) {
      const defaultBiz = await db.select({ id: businesses.id }).from(businesses).limit(1);
      businessId = defaultBiz[0]?.id;
    }

    if (!businessId) {
      return NextResponse.json({ error: "No active business found" }, { status: 400 });
    }

    // Check if category name already exists
    const existing = await db
      .select()
      .from(categories)
      .where(sql`LOWER(${categories.name}) = LOWER(${name})`)
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 });
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        name,
        description: body.description?.trim() || null,
        businessId,
      })
      .returning();

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
