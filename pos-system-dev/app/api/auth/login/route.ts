import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, generateToken } from "@/lib/auth"
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse 
} from "@/lib/standards/api-responses"
import { 
  handleApiError, 
  createErrorContext, 
  ValidationError,
  AuthenticationError 
} from "@/lib/standards/error-handling"
import { normalizeRole } from "@/lib/roles"

export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    const body = await request.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid JSON in request body", "body");
    }

    const { email, password } = body;

    // Validate required fields
    const validationErrors = [];
    if (!email) {
      validationErrors.push({
        field: "email",
        message: "Email is required",
        value: email
      });
    }
    if (!password) {
      validationErrors.push({
        field: "password", 
        message: "Password is required",
        value: undefined // Don't log password values
      });
    }

    if (validationErrors.length > 0) {
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Authenticate user
    const user = await authenticateUser(email, password);

    if (!user) {
      throw new AuthenticationError("Invalid email or password", context);
    }

    // Normalize role to ensure consistency
    const normalizedRole = normalizeRole(user.role);

    // Generate token
    const token = generateToken(user);

    // Create standardized success response
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      role: normalizedRole,
      isActive: user.isActive,
      businessId: user.businessId,
      locationId: user.locationId,
    };

    const response = NextResponse.json(createSuccessResponse(userData));

    // Set authentication cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400, // 24 hours
    });

    return response;
  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}
