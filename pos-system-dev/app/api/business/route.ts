import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
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

// GET business settings for the current user's business (all details)
export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    const accessControl = await validateRole(['ADMIN', 'MANAGER', 'CASHIER']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error!);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    let [business] = accessControl.user.businessId
      ? await db
          .select()
          .from(businesses)
          .where(eq(businesses.id, accessControl.user.businessId))
          .limit(1)
      : [];

    if (!business) {
      const [fallback] = await db.select().from(businesses).limit(1);
      business = fallback;
    }

    if (!business) {
      return NextResponse.json(createErrorResponse("Business not found", "BUSINESS_NOT_FOUND"), { status: 404 });
    }

    // Return all business fields
    const businessData = {
      id: business.id,
      name: business.name,
      logoUrl: business.logoUrl,
      industry: business.industry,
      address: business.address,
      phone: business.phone,
      email: business.email,
      website: business.website,
      taxRate: business.taxRate,
      currency: business.currency,
      timezone: business.timezone,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };

    return NextResponse.json(createSuccessResponse(businessData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// PUT: Update business settings
export async function PUT(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Require admin or manager role for business updates
    const accessControl = await validateRole(['ADMIN', 'MANAGER']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error!);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const body = await request.json();

    // Validate business data
    const validators = {
      name: createValidator<string>('Business name')
        .addRule(ValidationRules.required('Business name'))
        .addRule(ValidationRules.minLength('Business name', 1)),
      email: createValidator<string>('Email')
        .addRule(ValidationRules.email()),
      phone: createValidator<string>('Phone')
        .addRule(ValidationRules.phone()),
      taxRate: createValidator<number>('Tax rate')
        .addRule(ValidationRules.minValue('Tax rate', 0))
        .addRule(ValidationRules.maxValue('Tax rate', 100)),
    };

    const validationData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      taxRate: body.taxRate ? Number(body.taxRate) : undefined,
    };

    const validationResult = validateFields(validators, validationData);
    if (!validationResult.isValid) {
      return NextResponse.json(createValidationErrorResponse(
        validationResult.errors.map((error: string) => ({ field: 'business', message: error }))
      ), { status: 400 });
    }

    let targetBizId = accessControl.user.businessId;
    if (!targetBizId) {
      const [firstBiz] = await db.select({ id: businesses.id }).from(businesses).limit(1);
      targetBizId = firstBiz?.id;
    }

    const [updated] = await db
      .update(businesses)
      .set({
        name: body.name,
        logoUrl: body.logoUrl,
        industry: body.industry,
        address: body.address,
        phone: body.phone,
        email: body.email,
        website: body.website,
        taxRate: body.taxRate ? String(body.taxRate) : undefined,
        currency: body.currency,
        timezone: body.timezone,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, targetBizId))
      .returning();

    if (!updated) {
      return NextResponse.json(createErrorResponse("Business not found", "BUSINESS_NOT_FOUND"), { status: 404 });
    }

    return NextResponse.json(createSuccessResponse(updated));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

export const PATCH = PUT;

// DELETE: Delete the business and all associated data
export async function DELETE(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Require admin role for business deletion
    const accessControl = await validateRole(['ADMIN']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error!);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    // Delete the business (cascading deletes should handle related data)
    const [deletedBusiness] = await db
      .delete(businesses)
      .where(eq(businesses.id, accessControl.user.businessId))
      .returning();

    if (!deletedBusiness) {
      return NextResponse.json(createErrorResponse("Business not found", "BUSINESS_NOT_FOUND"), { status: 404 });
    }

    return NextResponse.json(createSuccessResponse({ 
      deleted: true,
      businessId: deletedBusiness.id,
      businessName: deletedBusiness.name
    }));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}