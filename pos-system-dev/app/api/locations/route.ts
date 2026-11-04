import { db } from '@/lib/db'
import { locations, locationSettings } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/locations - List all locations
export async function GET(request: NextRequest) {
  try {
    // Get all locations
    const allLocations = await db
      .select({
        id: locations.id,
        name: locations.name,
        address: locations.address,
        phone: locations.phone,
        email: locations.email,
        businessId: locations.businessId,
        taxRate: locations.taxRate,
        createdAt: locations.createdAt,
      })
      .from(locations)

    return NextResponse.json(allLocations)
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}