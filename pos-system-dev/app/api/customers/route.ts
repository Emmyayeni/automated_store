import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { ilike, or, desc, eq, and } from "drizzle-orm";
import { 
  createSuccessResponse, 
  createErrorResponse,
  createValidationErrorResponse 
} from "@/lib/standards/api-responses";
import { 
  handleApiError, 
  createErrorContext, 
  ValidationError 
} from "@/lib/standards/error-handling";
import { 
  validateSession, 
  createAuthenticationErrorResponse 
} from "@/lib/standards/auth-patterns";
import { CommonValidators, validateFields } from "@/lib/standards/validation";
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages";

export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const businessId = searchParams.get("businessId") || validation.user.businessId;

    if (!businessId) {
      return NextResponse.json(createErrorResponse("Business ID is required", "MISSING_BUSINESS_ID"), { status: 400 });
    }

    // Verify user has access to this business
    if (validation.user.role !== "ADMIN" && validation.user.businessId !== businessId) {
      return NextResponse.json(createErrorResponse("Access denied to this business", "ACCESS_DENIED"), { status: 403 });
    }

    let result;
    if (search) {
      const searchPattern = `%${search}%`;
      result = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.businessId, businessId),
            or(
              ilike(customers.name, searchPattern),
              ilike(customers.email, searchPattern),
              ilike(customers.phone, searchPattern)
            )
          )
        )
        .orderBy(desc(customers.createdAt));
    } else {
      result = await db
        .select()
        .from(customers)
        .where(eq(customers.businessId, businessId))
        .orderBy(desc(customers.createdAt));
    }

    return NextResponse.json(createSuccessResponse(result));
  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { name, email, phone, address, businessId } = await request.json();
    const targetBusinessId = businessId || validation.user.businessId;

    // Verify user has access to this business
    if (validation.user.role !== "ADMIN" && validation.user.businessId !== targetBusinessId) {
      return NextResponse.json(createErrorResponse("Access denied to this business", "ACCESS_DENIED"), { status: 403 });
    }

    // Validate input data
    const validators = {
      name: CommonValidators.name('Customer name', true),
      email: CommonValidators.email(false),
      phone: CommonValidators.phone(false),
    };

    const validationResult = validateFields(validators, { name, email, phone });
    if (!validationResult.isValid) {
      return NextResponse.json(createValidationErrorResponse(
        validationResult.errors.map(error => ({ field: 'customer', message: error }))
      ), { status: 400 });
    }

    const [customer] = await db
      .insert(customers)
      .values({
        name: name.trim(),
        email: email?.toLowerCase().trim() || null,
        phone: phone?.trim() || null,
        businessId: targetBusinessId,
        loyaltyPoints: 0,
      })
      .returning();

    return NextResponse.json(createSuccessResponse(customer), { status: 201 });
  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { id, name, email, phone, address, isActive, businessId } = await request.json();
    const targetBusinessId = businessId || validation.user.businessId;

    // Verify user has access to this business
    if (validation.user.role !== "ADMIN" && validation.user.businessId !== targetBusinessId) {
      return NextResponse.json(createErrorResponse("Access denied to this business", "ACCESS_DENIED"), { status: 403 });
    }

    if (!id) {
      return NextResponse.json(createErrorResponse("Customer ID is required", "MISSING_CUSTOMER_ID"), { status: 400 });
    }

    // Validate input data
    const validators = {
      name: CommonValidators.name('Customer name', true),
      email: CommonValidators.email(false),
      phone: CommonValidators.phone(false),
    };

    const validationResult = validateFields(validators, { name, email, phone });
    if (!validationResult.isValid) {
      return NextResponse.json(createValidationErrorResponse(
        validationResult.errors.map(error => ({ field: 'customer', message: error }))
      ), { status: 400 });
    }

    // Verify customer exists and belongs to the business
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.businessId, targetBusinessId)))
      .limit(1);

    if (!existingCustomer) {
      return NextResponse.json(createErrorResponse("Customer not found", "CUSTOMER_NOT_FOUND"), { status: 404 });
    }

    const [updatedCustomer] = await db
      .update(customers)
      .set({
        name: name.trim(),
        email: email?.toLowerCase().trim() || null,
        phone: phone?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, id), eq(customers.businessId, targetBusinessId)))
      .returning();

    return NextResponse.json(createSuccessResponse(updatedCustomer));
  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const businessId = searchParams.get("businessId") || validation.user.businessId;

    // Verify user has access to this business
    if (validation.user.role !== "ADMIN" && validation.user.businessId !== businessId) {
      return NextResponse.json(createErrorResponse("Access denied to this business", "ACCESS_DENIED"), { status: 403 });
    }

    if (!id) {
      return NextResponse.json(createErrorResponse("Customer ID is required", "MISSING_CUSTOMER_ID"), { status: 400 });
    }

    if (!businessId) {
      return NextResponse.json(createErrorResponse("Business ID is required", "MISSING_BUSINESS_ID"), { status: 400 });
    }

    // Verify customer exists and belongs to the business
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
      .limit(1);

    if (!existingCustomer) {
      return NextResponse.json(createErrorResponse("Customer not found", "CUSTOMER_NOT_FOUND"), { status: 404 });
    }

    // Delete customer record
    const [deletedCustomer] = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
      .returning();

    return NextResponse.json(createSuccessResponse({ 
      deleted: true, 
      customer: deletedCustomer 
    }));
  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}