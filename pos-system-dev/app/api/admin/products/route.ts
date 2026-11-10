import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { products, businesses } from '@/lib/schema'
import { eq, and, like, or, desc, asc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || (session.user as any).businessId
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Build query conditions
    let whereConditions: any[] = []
    if (businessId) {
      whereConditions.push(eq(products.businessId, businessId))
    }
    
    if (category && category !== 'all' && category !== 'ALL') {
      whereConditions.push(eq(products.category, category))
    }

    if (search) {
      whereConditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.barcode, `%${search}%`),
          like(products.sku, `%${search}%`)
        )!
      )
    }

    // Build order by
    const orderDirection = sortOrder === 'desc' ? desc : asc
    let orderBy
    switch (sortBy) {
      case 'price':
        orderBy = orderDirection(products.price)
        break
      case 'category':
        orderBy = orderDirection(products.category)
        break
      case 'name':
      default:
        orderBy = orderDirection(products.name)
        break
    }

    const queryBuilder = db
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        description: products.description,
        imageUrl: products.imageUrl,
        price: products.price,
        category: products.category,
        barcode: products.barcode,
        sku: products.sku,
        isActive: products.isActive,
        costPrice: products.costPrice,
        stockLevel: products.stockLevel,
        reorderLevel: products.reorderLevel,
        location: products.location,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt
      })
      .from(products)

    const result = whereConditions.length > 0
      ? await queryBuilder.where(and(...whereConditions)).orderBy(orderBy)
      : await queryBuilder.orderBy(orderBy)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    let businessId = body.businessId || (session.user as any).businessId
    if (!businessId) {
      const [firstBiz] = await db.select({ id: businesses.id }).from(businesses).limit(1)
      businessId = firstBiz?.id
    }
    
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

    // Category-specific validation
    if (body.category === 'pharmaceuticals') {
      if (body.drugType === 'prescription' && (!body.genericName || !body.activeIngredient)) {
        return NextResponse.json(
          { error: 'Generic name and active ingredient are required for prescription drugs' },
          { status: 400 }
        )
      }
    }

    if (['medical-equipment', 'laboratory-equipment'].includes(body.category)) {
      if (!body.modelNumber) {
        return NextResponse.json(
          { error: 'Model number is required for equipment' },
          { status: 400 }
        )
      }
    }

    // Insert the product
    const [newProduct] = await db
      .insert(products)
      .values({
        businessId: body.businessId,
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        price: body.price.toString(),
        category: body.category,
        barcode: body.barcode,
        sku: body.sku,
        isActive: body.isActive ?? true,
        
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
        location: body.location
      })
      .returning()

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}