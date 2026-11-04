import { NextRequest, NextResponse } from "next/server";
import { 
  createSuccessResponse, 
  createAuthErrorResponse, 
  createNotFoundResponse 
} from "@/lib/standards/api-responses";
import { 
  handleApiError, 
  createErrorContext, 
  NotFoundError,
  AuthenticationError 
} from "@/lib/standards/error-handling";
import { 
  validateSession, 
  createAuthenticationErrorResponse 
} from "@/lib/standards/auth-patterns";

// GET - Get current session information
export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Create standardized success response
    const responseData = {
      user: {
        id: validation.user.id,
        email: validation.user.email,
        name: validation.user.name,
        role: validation.user.role,
        businessId: validation.user.businessId,
        locationId: validation.user.locationId,
        isActive: validation.user.isActive,
        store: validation.user.store,
      },
      session: {
        expires: validation.session?.expires,
      }
    };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// POST - Refresh session
export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Update last activity timestamp
    const { db } = await import("@/lib/db");
    const { users } = await import("@/lib/schema");
    const { eq } = await import("drizzle-orm");
    
    await db
      .update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.email, validation.user.email));

    const responseData = {
      message: "Session refreshed successfully",
      timestamp: new Date().toISOString(),
      user: {
        id: validation.user.id,
        email: validation.user.email,
        name: validation.user.name,
        role: validation.user.role,
      }
    };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// DELETE - End session (logout)
export async function DELETE(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Note: NextAuth handles session termination through its own endpoints
    // This is for any additional cleanup we might need
    
    const responseData = {
      message: "Session ended successfully",
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}
