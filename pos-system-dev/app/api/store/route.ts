import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { locations, businesses } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { auth } from "@/lib/auth"
import { 
  createSuccessResponse, 
  createErrorResponse 
} from "@/lib/standards/api-responses"

// GET: all stores/locations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(createErrorResponse("Unauthorized"), { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get("businessId") || (session.user as any).businessId

    const stores = businessId
      ? await db.select().from(locations).where(eq(locations.businessId, businessId))
      : await db.select().from(locations)

    return NextResponse.json(createSuccessResponse(stores))
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(createErrorResponse("Failed to fetch stores"), { status: 500 });
  }
}

// CREATE: new store for a business
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(createErrorResponse("Unauthorized"), { status: 401 })
    }

    const data = await req.json()
    let businessId = data.businessId || (session.user as any).businessId

    if (!businessId) {
      const [firstBiz] = await db.select({ id: businesses.id }).from(businesses).limit(1)
      businessId = firstBiz?.id
    }

    if (!businessId) {
      return NextResponse.json(createErrorResponse("No business registered in system"), { status: 400 })
    }

    // Insert fields that exist in the schema
    const insertData = {
      businessId,
      name: data.name,
      address: data.address ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      timezone: data.timezone ?? "Africa/Freetown",
      currency: data.currency ?? "SLL",
      taxRate: data.taxRate ?? "0.08",
      status: data.status ?? "active",
      openHours: data.openHours ?? "8:00 AM - 10:00 PM",
      revenue: data.revenue ?? 0,
    }

    const [inserted] = await db.insert(locations).values(insertData).returning()
    return NextResponse.json(createSuccessResponse(inserted), { status: 201 })
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(createErrorResponse("Failed to create store"), { status: 500 });
  }
}

// DELETE: store by id (only if it belongs to the business)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json(createErrorResponse("Unauthorized"), { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json(createErrorResponse("Missing store id"), { status: 400 })

    // Ensure the store belongs to the business
    const [store] = await db.select().from(locations).where(eq(locations.id, id)).limit(1)
    if (!store || store.businessId !== session.user.businessId) {
      return NextResponse.json(createErrorResponse("Not found or forbidden"), { status: 404 })
    }

    const [deleted] = await db.delete(locations).where(eq(locations.id, id)).returning()
    return NextResponse.json(createSuccessResponse(deleted))
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json(createErrorResponse("Failed to delete store"), { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json(createErrorResponse("Unauthorized"), { status: 401 });
    }
    const data = await req.json();
    if (!data.id || !data.businessId || data.businessId !== session.user.businessId) {
      return NextResponse.json(createErrorResponse("Invalid request"), { status: 400 });
    }

    // Only update fields that exist in your schema!
    const updateData = {
      name: data.name,
      address: data.address ?? "",
      phone: data.phone ?? "",
      openHours: data.openHours ?? "",
      status: data.status ?? "active",
      revenue: data.revenue ?? 0,
      // Note: manager field would need to be handled separately as managerId if needed
    };

    const [updated] = await db
      .update(locations)
      .set(updateData)
      .where(and(eq(locations.id, data.id), eq(locations.businessId, data.businessId)))
      .returning();

    if (!updated) {
      return NextResponse.json(createErrorResponse("Store not found or forbidden"), { status: 404 });
    }

    return NextResponse.json(createSuccessResponse(updated));
  } catch (error) {
    console.error("Error updating store:", error);
    return NextResponse.json(createErrorResponse("Failed to update store"), { status: 500 });
  }
}