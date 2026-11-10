import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { categories, products } from "@/lib/schema"
import { eq, sql } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })

    const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
    if (rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })

    const body = await req.json()
    const name = body.name?.trim()

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
    if (existing.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const oldName = existing[0].name

    const updated = await db
      .update(categories)
      .set({
        name,
        description: body.description !== undefined ? body.description : existing[0].description,
      })
      .where(eq(categories.id, id))
      .returning()

    // Also cascade update category text in products if changed
    if (oldName !== name) {
      await db
        .update(products)
        .set({ category: name })
        .where(eq(products.category, oldName))
    }

    return NextResponse.json(updated[0])
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })

    const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
    if (existing.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const catName = existing[0].name

    // Check if any product is assigned to this category
    const linkedProducts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.category, catName))

    const pCount = linkedProducts[0]?.count || 0
    if (pCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category "${catName}" because it contains ${pCount} active product(s). Reassign products before deleting.`,
        },
        { status: 400 }
      )
    }

    await db.delete(categories).where(eq(categories.id, id))

    return NextResponse.json({ success: true, message: `Category "${catName}" deleted` })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
