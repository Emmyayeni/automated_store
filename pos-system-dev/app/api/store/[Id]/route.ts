import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { locations } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { 
  createSuccessResponse, 
  createErrorResponse 
} from "@/lib/standards/api-responses"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ Id: string }> }
) {
  try {
    const resolvedParams = await params
    console.log("params:", resolvedParams)
    const storeId = resolvedParams.Id

    if (!storeId) {
      return NextResponse.json(createErrorResponse("Missing store id"), { status: 400 })
    }

    // Fetch all columns for the store/location by id
    const store = await db
      .select()
      .from(locations)
      .where(eq(locations.id, storeId))
      .limit(1)

    if (!store || store.length === 0) {
      return NextResponse.json(createErrorResponse("Store not found"), { status: 404 })
    }

    return NextResponse.json(createSuccessResponse(store[0]))
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json(createErrorResponse("Failed to fetch store"), { status: 500 });
  }
}