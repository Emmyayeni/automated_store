import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { products } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.category || !body.price) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, price' },
        { status: 400 }
      )
    }

    // Validate price
    if (isNaN(body.price) || body.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      )
    }

    // Check if product exists
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Update the product
    const [updatedProduct] = await db
      .update(products)
      .set({
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        price: body.price.toString(),
        category: body.category,
        barcode: body.barcode,
        sku: body.sku,
        isActive: body.isActive,
        
        // Pharmaceutical fields
        drugType: body.drugType,
        drugForm: body.drugForm,
        strength: body.strength,
        genericName: body.genericName,
        brandName: body.brandName,
        manufacturer: body.manufacturer,
        batchNumber: body.batchNumber,
        expiryDate: body.expiryDate,
        manufacturingDate: body.manufacturingDate,
        storageConditions: body.storageConditions,
        activeIngredient: body.activeIngredient,
        dosageInstructions: body.dosageInstructions,
        requiresPrescription: body.requiresPrescription,
        isControlledSubstance: body.isControlledSubstance,
        
        // Equipment fields
        modelNumber: body.modelNumber,
        serialNumber: body.serialNumber,
        warrantyPeriod: body.warrantyPeriod,
        
        // Common fields
        costPrice: body.costPrice?.toString(),
        stockLevel: body.stockLevel,
        reorderLevel: body.reorderLevel,
        location: body.location,
        
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning()

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if product exists
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete the product
    await db
      .delete(products)
      .where(eq(products.id, id))

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}