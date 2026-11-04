import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { 
  createSuccessResponse,
  createErrorResponse,
  createAuthErrorResponse,
  createAuthorizationErrorResponse,
  createValidationErrorResponse,
  handleApiError,
  createErrorContext,
  validateRole,
  validateFields,
  createValidator,
  ValidationRules
} from '@/lib/standards';

// GET /api/team?businessId=...&locationId=...
export async function GET(req: NextRequest) {
  try {
    const context = createErrorContext(req);
    
    // Require authenticated user
    const accessControl = await validateRole(['ADMIN', 'MANAGER', 'CASHIER']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error!);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") || accessControl.user.businessId;
    const locationId = searchParams.get("locationId");

    // Ensure user can only access their business data
    if (businessId !== accessControl.user.businessId && accessControl.user.role !== 'ADMIN') {
      return NextResponse.json(createErrorResponse("Access denied to this business", "BUSINESS_ACCESS_DENIED"), { status: 403 });
    }

    let whereClause;
    if (locationId) {
      whereClause = and(eq(users.businessId, businessId), eq(users.locationId, locationId));
    } else {
      whereClause = eq(users.businessId, businessId);
    }

    const allUsers = await db.select().from(users).where(whereClause);

    const safeUsers = allUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role?.toLowerCase(),
      status: u.isActive ? "active" : "inactive",
      joinDate: u.createdAt?.toISOString().split("T")[0],
      avatar: null, // Avatar field doesn't exist in schema
      store: u.locationId || null,
      businessId: u.businessId || null,
    }));

    return NextResponse.json(createSuccessResponse(safeUsers));

  } catch (error) {
    const context = createErrorContext(req);
    return handleApiError(error, context);
  }
}

// POST /api/team - Invite/add a new user
export async function POST(req: NextRequest) {
  try {
    const context = createErrorContext(req);
    
    // Require admin or manager role for adding team members
    const accessControl = await validateRole(['ADMIN', 'MANAGER']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error!);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const data = await req.json();

    // Validate required fields
    const validators = {
      email: createValidator<string>('Email')
        .addRule(ValidationRules.required('Email'))
        .addRule(ValidationRules.email()),
      role: createValidator<string>('Role')
        .addRule(ValidationRules.required('Role'))
        .addRule(ValidationRules.role()),
      businessId: createValidator<string>('Business ID')
        .addRule(ValidationRules.required('Business ID')),
    };

    const validationData = {
      email: data.email,
      role: data.role?.toUpperCase(),
      businessId: data.businessId || accessControl.user.businessId,
    };

    const validationResult = validateFields(validators, validationData);
    if (!validationResult.isValid) {
      return NextResponse.json(createValidationErrorResponse(
        validationResult.errors.map((error: string) => ({ field: 'team', message: error }))
      ), { status: 400 });
    }

    // Ensure user can only add members to their business
    if (validationData.businessId !== accessControl.user.businessId && accessControl.user.role !== 'ADMIN') {
      return NextResponse.json(createErrorResponse("Access denied to this business", "BUSINESS_ACCESS_DENIED"), { status: 403 });
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, data.email), eq(users.businessId, validationData.businessId)))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(createErrorResponse("User already exists in this business", "USER_EXISTS"), { status: 409 });
    }

    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        name: data.name || data.email.split("@")[0],
        role: validationData.role,
        isActive: false, // Pending until accepted
        locationId: data.store || null,
        businessId: validationData.businessId,
      })
      .returning();

    return NextResponse.json(createSuccessResponse(user), { status: 201 });

  } catch (error) {
    const context = createErrorContext(req);
    return handleApiError(error, context);
  }
}

// PUT /api/team - Update a user's role, store, or status
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id) {
      return NextResponse.json(createErrorResponse("User ID is required"), { status: 400 });
    }
    const updateData: any = {};
    if (data.role) updateData.role = data.role.toUpperCase();
    if (data.store) updateData.locationId = data.store;
    if (data.status) updateData.isActive = data.status === "active";
    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, data.id))
      .returning();
    if (!updated) {
      return NextResponse.json(createErrorResponse("User not found"), { status: 404 });
    }
    return NextResponse.json(createSuccessResponse(updated));
  } catch (error) {
    console.error("Error updating team member:", error);
    return NextResponse.json(createErrorResponse("Failed to update team member"), { status: 500 });
  }
}

// DELETE /api/team?id=USER_ID - Remove a user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(createErrorResponse("User ID is required"), { status: 400 });
    }
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
    if (!deleted) {
      return NextResponse.json(createErrorResponse("User not found"), { status: 404 });
    }
    return NextResponse.json(createSuccessResponse({ deleted: true }));
  } catch (error) {
    console.error("Error deleting team member:", error);
    return NextResponse.json(createErrorResponse("Failed to delete team member"), { status: 500 });
  }
}