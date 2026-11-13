import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shifts, users, locations } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { 
  createSuccessResponse, 
  createErrorResponse 
} from "@/lib/standards/api-responses";

// GET /api/shifts?userId=...&locationId=...&active=true
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const locationId = searchParams.get("locationId");
  const activeOnly = searchParams.get("active") === "true";

  try {
    let query = db
      .select({
        id: shifts.id,
        userId: shifts.userId,
        locationId: shifts.locationId,
        openedAt: shifts.startTime,
        closedAt: shifts.endTime,
        openingCash: shifts.openingCash,
        closingCash: shifts.closingCash,
        status: shifts.status,
        notes: shifts.notes,
        createdAt: shifts.createdAt,
        updatedAt: shifts.updatedAt,
        userName: users.name,
        locationName: locations.name,
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.userId, users.id))
      .leftJoin(locations, eq(shifts.locationId, locations.id));

    let whereConditions = [];

    if (userId) {
      whereConditions.push(eq(shifts.userId, userId));
    }
    if (locationId) {
      whereConditions.push(eq(shifts.locationId, locationId));
    }
    if (activeOnly) {
      whereConditions.push(eq(shifts.status, "active"));
    }

    if (whereConditions.length > 0) {
      const result = await query.where(and(...whereConditions)).orderBy(desc(shifts.startTime));
      
      // Convert numeric fields
      const formattedResult = result.map(shift => ({
        ...shift,
        openingCash: shift.openingCash ? Number(shift.openingCash) : null,
        closingCash: shift.closingCash ? Number(shift.closingCash) : null,
      }));

      return NextResponse.json(createSuccessResponse(formattedResult));
    } else {
      const result = await query.orderBy(desc(shifts.startTime));
      
      // Convert numeric fields
      const formattedResult = result.map(shift => ({
        ...shift,
        openingCash: shift.openingCash ? Number(shift.openingCash) : null,
        closingCash: shift.closingCash ? Number(shift.closingCash) : null,
      }));

      return NextResponse.json(createSuccessResponse(formattedResult));
    }
  } catch (error) {
    console.error("Error fetching shifts:", error);
    return NextResponse.json(createErrorResponse("Failed to fetch shifts"), { status: 500 });
  }
}

// POST /api/shifts - Start a new shift
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(createErrorResponse("Unauthorized"), { status: 401 });
    }

    const body = await request.json();
    const { locationId, openingCash, notes } = body;
    const userId = session.user.id;

    if (!locationId) {
      return NextResponse.json(createErrorResponse("locationId is required"), { status: 400 });
    }

    // Check if user already has an open shift at this location
    const existingShift = await db
      .select()
      .from(shifts)
      .where(and(
        eq(shifts.userId, userId),
        eq(shifts.locationId, locationId),
        eq(shifts.status, "active")
      ));

    if (existingShift.length > 0) {
      return NextResponse.json(createErrorResponse(
        "You already have an open shift at this location"
      ), { status: 400 });
    }

    const [shift] = await db
      .insert(shifts)
      .values({
        businessId: session.user.businessId as string,
        userId,
        locationId,
        openingCash: openingCash || 0,
        status: "active",
        notes,
      })
      .returning();

    return NextResponse.json(createSuccessResponse({
      ...shift,
      openingCash: shift.openingCash ? Number(shift.openingCash) : null,
    }), { status: 201 });
  } catch (error) {
    console.error("Error starting shift:", error);
    return NextResponse.json(createErrorResponse("Failed to start shift"), { status: 500 });
  }
}

// PATCH /api/shifts - Close a shift and generate summary
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(createErrorResponse("Unauthorized"), { status: 401 });
    }

    const body = await request.json();
    const { id, closingCash, notes, printSummary = true } = body;

    if (!id) {
      return NextResponse.json(createErrorResponse("Shift id is required"), { status: 400 });
    }

    // Verify shift belongs to current user
    const [existingShift] = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.userId, session.user.id)));

    if (!existingShift) {
      return NextResponse.json(createErrorResponse("Shift not found"), { status: 404 });
    }

    if (existingShift.status === "completed") {
      return NextResponse.json(createErrorResponse("Shift is already closed"), { status: 400 });
    }

    const [updated] = await db
      .update(shifts)
      .set({
        closingCash,
        endTime: new Date(),
        status: "completed",
        notes,
        updatedAt: new Date(),
      })
      .where(eq(shifts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(createErrorResponse("Failed to close shift"), { status: 500 });
    }

    // Generate shift summary for printing
    let shiftSummary = null;
    if (printSummary) {
      try {
        const summaryResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/shifts/${id}/summary`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (summaryResponse.ok) {
          shiftSummary = await summaryResponse.json();
        }
      } catch (error) {
        console.error("Error generating shift summary:", error);
      }
    }

    return NextResponse.json(createSuccessResponse({
      shift: {
        ...updated,
        openingCash: updated.openingCash ? Number(updated.openingCash) : null,
        closingCash: updated.closingCash ? Number(updated.closingCash) : null,
      },
      shiftSummary,
    }));
  } catch (error) {
    console.error("Error closing shift:", error);
    return NextResponse.json(createErrorResponse("Failed to close shift"), { status: 500 });
  }
}