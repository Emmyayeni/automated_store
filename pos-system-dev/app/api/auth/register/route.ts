import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { 
  createSuccessResponse, 
  createValidationErrorResponse 
} from "@/lib/standards/api-responses";
import { 
  handleApiError, 
  createErrorContext, 
  ValidationError,
  BusinessLogicError 
} from "@/lib/standards/error-handling";
import { normalizeRole } from "@/lib/roles";
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages";

export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    const body = await request.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid JSON in request body", "body");
    }

    const { email, password, firstName, lastName, role = "CASHIER" } = body;

    // Validate required fields
    const validationErrors = [];
    
    if (!email) {
      validationErrors.push({
        field: "email",
        message: VALIDATION_MESSAGES.REQUIRED("Email"),
        value: email
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationErrors.push({
        field: "email",
        message: VALIDATION_MESSAGES.INVALID_EMAIL,
        value: email
      });
    }
    
    if (!password) {
      validationErrors.push({
        field: "password",
        message: VALIDATION_MESSAGES.REQUIRED("Password"),
        value: undefined // Don't log password values
      });
    } else if (password.length < 8) {
      validationErrors.push({
        field: "password",
        message: VALIDATION_MESSAGES.MIN_LENGTH("Password", 8),
        value: undefined
      });
    }
    
    if (!firstName) {
      validationErrors.push({
        field: "firstName",
        message: VALIDATION_MESSAGES.REQUIRED("First name"),
        value: firstName
      });
    }
    
    if (!lastName) {
      validationErrors.push({
        field: "lastName",
        message: VALIDATION_MESSAGES.REQUIRED("Last name"),
        value: lastName
      });
    }

    if (validationErrors.length > 0) {
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Check if email already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
      
    if (existing) {
      throw new BusinessLogicError("Email address is already registered", context);
    }

    // Normalize role to ensure consistency
    const normalizedRole = normalizeRole(role);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with standardized name field
    const name = `${firstName} ${lastName}`.trim();
    
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: normalizedRole,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

    // Create standardized success response
    const responseData = {
      message: "User registered successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      }
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 201 });

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}