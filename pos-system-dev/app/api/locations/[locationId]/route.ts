import { db } from '@/lib/db'
import { locations, locationSettings } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/locations/[locationId]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For managers, they can only access their assigned location
    if (session.user.role === 'MANAGER' && session.user.locationId !== locationId) {
      return NextResponse.json(
        { error: "Access denied. Managers can only access their assigned location." },
        { status: 403 }
      );
    }

    // Get main location info
  const [location] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, locationId))
    .limit(1)

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    // For non-admins, verify the location belongs to their business
    if (session.user.role !== 'ADMIN') {
      if (location.businessId !== session.user.businessId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Get settings (if any)
    const [settings] = await db
      .select()
      .from(locationSettings)
      .where(eq(locationSettings.locationId, locationId))
      .limit(1)

    // Ensure taxRate is always a string and fallback to "0.08" if missing or invalid
    let taxRate: string
    if (
      location.taxRate === null ||
      location.taxRate === undefined ||
      isNaN(Number(location.taxRate))
    ) {
      taxRate = "0.08"
    } else {
      taxRate = location.taxRate.toString()
    }

    // Merge settings into location response
    return NextResponse.json({
      id: location.id,
      storeName: location.name,
      storeAddress: location.address,
      storePhone: location.phone,
      storeEmail: location.email,
      taxRate,
      receiptFooter: settings?.receiptFooter ?? "",
      autoPrintReceipt: settings?.autoPrintReceipt ?? false,
      // loyaltyPointsRate: settings?.loyaltyPointsRate ?? "", // Uncomment if you add this column
    });
  } catch (error: any) {
    console.error("Error in GET /locations/[locationId]:", error);
    return NextResponse.json(
      { error: "Failed to fetch location", details: error?.message },
      { status: 500 }
    );
  }
}

// POST /api/locations/[locationId]
export async function POST(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For managers, they can only update their assigned location
    if (session.user.role === 'MANAGER' && session.user.locationId !== locationId) {
      return NextResponse.json(
        { error: "Access denied. Managers can only update their assigned location." },
        { status: 403 }
      );
    }

    // For non-admins, verify the location belongs to their business
    if (session.user.role !== 'ADMIN') {
      const [location] = await db
        .select({ businessId: locations.businessId })
        .from(locations)
        .where(eq(locations.id, locationId))
        .limit(1);

      if (!location || location.businessId !== session.user.businessId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const body = await request.json()

  // Update main location fields
  const locationUpdate: any = {}
  if (body.storeName !== undefined) locationUpdate.name = body.storeName
  if (body.storeAddress !== undefined) locationUpdate.address = body.storeAddress
  if (body.storePhone !== undefined) locationUpdate.phone = body.storePhone
  if (body.storeEmail !== undefined) locationUpdate.email = body.storeEmail
  if (body.taxRate !== undefined) locationUpdate.taxRate = body.taxRate

    if (Object.keys(locationUpdate).length > 0) {
      await db.update(locations)
        .set(locationUpdate)
        .where(eq(locations.id, locationId))
    }

  // Update or insert settings
  const settingsUpdate: any = {}
  if (body.receiptFooter !== undefined) settingsUpdate.receiptFooter = body.receiptFooter
  if (body.autoPrintReceipt !== undefined) settingsUpdate.autoPrintReceipt = body.autoPrintReceipt
  if (body.loyaltyPointsRate !== undefined) settingsUpdate.loyaltyPointsRate = body.loyaltyPointsRate

    if (Object.keys(settingsUpdate).length > 0) {
      // Upsert logic
      const [existing] = await db
        .select()
        .from(locationSettings)
        .where(eq(locationSettings.locationId, locationId))
        .limit(1)

      if (existing) {
        await db.update(locationSettings)
          .set(settingsUpdate)
          .where(eq(locationSettings.locationId, locationId))
      } else {
        await db.insert(locationSettings)
          .values({ locationId, ...settingsUpdate })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in POST /locations/[locationId]:", error);
    return NextResponse.json(
      { error: "Failed to update location", details: error?.message },
      { status: 500 }
    );
  }
}