import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auditLogs, users } from "@/lib/schema"
import { eq, and, desc } from "drizzle-orm"
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createAuthErrorResponse,
  createAuthorizationErrorResponse 
} from "@/lib/standards/api-responses";
import { 
  handleApiError, 
  createErrorContext,
  ValidationError 
} from "@/lib/standards/error-handling";
import { 
  validateSession, 
  validatePermission 
} from "@/lib/standards/auth-patterns";
import { formatApiDate } from "@/lib/standards/formatting";
import { ValidationRules, createValidator } from "@/lib/standards/validation";

export async function GET(req: NextRequest) {
  try {
    const context = createErrorContext(req);
    
    // Validate session and require dashboard permission
    const accessControl = await validatePermission('view_dashboard');
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get("locationId")

    // Validate required location ID
    if (!locationId) {
      throw new ValidationError("Location ID is required", "locationId", locationId, context);
    }

    // Validate location ID format
    const uuidValidator = createValidator<string>('Location ID')
      .addRule(ValidationRules.custom(
        (value: string) => /^[0-9a-fA-F-]{36}$/.test(value),
        'Invalid location ID format'
      ));
    
    const locationValidation = uuidValidator.validate(locationId);
    if (!locationValidation.isValid) {
      throw new ValidationError(locationValidation.error!, 'locationId', locationId, context);
    }

    const logs = await db
      .select({
        name: users.name,
        action: auditLogs.action,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(eq(auditLogs.locationId, locationId)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10)

    // Format for dashboard
    const activity = logs.map(log => ({
      name: log.name || "Unknown",
      action: formatAction(log.action, log.createdAt),
    }))

    return NextResponse.json(createSuccessResponse({
      activity,
      metadata: {
        locationId,
        generatedAt: formatApiDate(new Date()),
        generatedBy: accessControl.user.id,
        recordCount: activity.length
      }
    }));

  } catch (error) {
    const context = createErrorContext(req);
    return handleApiError(error, context);
  }
}

// Helper to format action string
function formatAction(action: string, createdAt: Date | null) {
  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : ""
  switch (action) {
    case "login":
      return `logged in at ${time}`
    case "logout":
      return `logged out at ${time}`
    case "transaction":
      return `completed a sale at ${time}`
    case "refund":
      return `processed a refund at ${time}`
    case "void":
      return `voided a transaction at ${time}`
    default:
      return `${action} at ${time}`
  }
}