import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { locations, locationSettings } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params

    if (!locationId) {
      return NextResponse.json({ error: "Missing locationId parameter" }, { status: 400 })
    }

    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(locationId)

    let locationRecord: any = null
    if (isValidUUID) {
      const locs = await db.select().from(locations).where(eq(locations.id, locationId)).limit(1)
      if (locs.length > 0) {
        locationRecord = locs[0]
      }
    }

    // Fallback: If not found or not a valid UUID, fetch the first available branch
    if (!locationRecord) {
      const fallbackLocs = await db.select().from(locations).limit(1)
      if (fallbackLocs.length > 0) {
        locationRecord = fallbackLocs[0]
      }
    }

    if (!locationRecord) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    // Fetch related locationSettings
    const settingsRows = await db
      .select()
      .from(locationSettings)
      .where(eq(locationSettings.locationId, locationRecord.id))
      .limit(1)

    const setting = settingsRows.length > 0 ? settingsRows[0] : null

    return NextResponse.json({
      id: locationRecord.id,
      name: locationRecord.name,
      storeName: locationRecord.name,
      branchCode: locationRecord.branchCode,
      address: locationRecord.address || "",
      storeAddress: locationRecord.address || "",
      phone: locationRecord.phone || "",
      storePhone: locationRecord.phone || "",
      email: locationRecord.email || "",
      storeEmail: locationRecord.email || "",
      taxRate: locationRecord.taxRate ? String(locationRecord.taxRate) : "0.08",
      currency: locationRecord.currency || "USD",
      timezone: locationRecord.timezone || "America/New_York",
      status: locationRecord.status || "active",
      receiptHeader: setting?.receiptHeader || locationRecord.name,
      receiptFooter: setting?.receiptFooter || "Thank you for shopping with us!",
      autoPrintReceipt: setting?.autoPrintReceipt ?? true,
      acceptedPayments: setting?.acceptedPayments || "cash,card",
      cashDrawerStart: setting?.cashDrawerStart || "200.00",
      loyaltyProgram: setting?.loyaltyProgram ?? true,
    })
  } catch (error) {
    console.error("Error fetching location details:", error)
    return NextResponse.json({ error: "Failed to fetch location details" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const body = await req.json()

    if (!locationId) {
      return NextResponse.json({ error: "Missing locationId" }, { status: 400 })
    }

    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(locationId)
    let targetId = locationId

    if (!isValidUUID) {
      const fallback = await db.select().from(locations).limit(1)
      if (fallback.length === 0) {
        return NextResponse.json({ error: "No location available to update" }, { status: 404 })
      }
      targetId = fallback[0].id
    }

    // Update location basic fields
    const updateLocData: any = { updatedAt: new Date() }
    if (body.storeName || body.name) updateLocData.name = body.storeName || body.name
    if (body.storeAddress !== undefined) updateLocData.address = body.storeAddress
    if (body.address !== undefined) updateLocData.address = body.address
    if (body.storePhone !== undefined) updateLocData.phone = body.storePhone
    if (body.phone !== undefined) updateLocData.phone = body.phone
    if (body.storeEmail !== undefined) updateLocData.email = body.storeEmail
    if (body.email !== undefined) updateLocData.email = body.email
    if (body.taxRate !== undefined) updateLocData.taxRate = String(body.taxRate)
    if (body.currency) updateLocData.currency = body.currency

    await db.update(locations).set(updateLocData).where(eq(locations.id, targetId))

    // Upsert locationSettings
    const existingSettings = await db
      .select()
      .from(locationSettings)
      .where(eq(locationSettings.locationId, targetId))
      .limit(1)

    const settingPayload: any = {
      updatedAt: new Date(),
    }
    if (body.receiptHeader !== undefined) settingPayload.receiptHeader = body.receiptHeader
    if (body.receiptFooter !== undefined) settingPayload.receiptFooter = body.receiptFooter
    if (body.autoPrintReceipt !== undefined) settingPayload.autoPrintReceipt = Boolean(body.autoPrintReceipt)
    if (body.acceptedPayments !== undefined) settingPayload.acceptedPayments = body.acceptedPayments
    if (body.cashDrawerStart !== undefined) settingPayload.cashDrawerStart = String(body.cashDrawerStart)

    if (existingSettings.length > 0) {
      await db
        .update(locationSettings)
        .set(settingPayload)
        .where(eq(locationSettings.locationId, targetId))
    } else {
      await db.insert(locationSettings).values({
        locationId: targetId,
        receiptHeader: body.receiptHeader || body.storeName || "Supermarket Branch",
        receiptFooter: body.receiptFooter || "Thank you for shopping with us!",
        autoPrintReceipt: body.autoPrintReceipt ?? true,
        acceptedPayments: body.acceptedPayments || "cash,card",
        cashDrawerStart: String(body.cashDrawerStart || "200.00"),
      })
    }

    return NextResponse.json({
      success: true,
      message: "Branch settings updated successfully",
      locationId: targetId,
    })
  } catch (error) {
    console.error("Error updating location settings:", error)
    return NextResponse.json({ error: "Failed to update location settings" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ locationId: string }> }
) {
  return POST(req, context)
}
