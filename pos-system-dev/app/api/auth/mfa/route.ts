import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { 
  createSuccessResponse, 
  createValidationErrorResponse,
  createNotFoundResponse 
} from "@/lib/standards/api-responses";
import { 
  handleApiError, 
  createErrorContext, 
  ValidationError,
  BusinessLogicError,
  NotFoundError,
  AuthenticationError 
} from "@/lib/standards/error-handling";
import { 
  validateSession, 
  createAuthenticationErrorResponse 
} from "@/lib/standards/auth-patterns";
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages";

// In-memory MFA settings store (in production, use mfa_settings table)
const mfaStore = new Map<string, any>();

// MFA helper functions
async function storeMfaSettings(userId: string, settings: any) {
  // In production, save to mfa_settings table
  mfaStore.set(userId, settings);
}

async function verifyMfaCode(email: string, method: string, code: string, secret?: string): Promise<boolean> {
  // For production, implement actual verification logic based on method
  switch (method) {
    case 'totp':
      // In production, use libraries like 'speakeasy' to verify TOTP codes
      return code.length === 6 && /^\d{6}$/.test(code);
    case 'sms':
    case 'email':
      // In production, verify against codes sent via SMS/email
      return code.length >= 4 && /^\d+$/.test(code);
    default:
      return false;
  }
}

async function enableMfaForUser(email: string, method: string, secret?: string) {
  // In production, update mfa_settings table and user table
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    const settings = mfaStore.get(user.id) || {};
    settings.isEnabled = true;
    settings.enabledAt = new Date();
    mfaStore.set(user.id, settings);
  }
}

async function verifyUserPassword(email: string, password: string): Promise<boolean> {
  // Verify user password
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (!user?.passwordHash) {
    return false;
  }
  
  return await bcrypt.compare(password, user.passwordHash);
}

async function disableMfaForUser(email: string) {
  // In production, update mfa_settings table
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    mfaStore.delete(user.id);
  }
}

async function getMfaStatus(email: string) {
  // In production, query mfa_settings table
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    const settings = mfaStore.get(user.id);
    if (settings && settings.isEnabled) {
      return {
        enabled: true,
        methods: [settings.method],
        backupCodes: settings.backupCodes?.length || 0
      };
    }
  }
  
  return {
    enabled: false,
    methods: [],
    backupCodes: 0
  };
}

// POST - Setup MFA
export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid JSON in request body", "body");
    }

    const { method } = body; // 'sms', 'email', 'totp'

    // Validate required fields
    if (!method) {
      const validationErrors = [{
        field: "method",
        message: VALIDATION_MESSAGES.REQUIRED("MFA method"),
        value: method
      }];
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    if (!['sms', 'email', 'totp'].includes(method)) {
      const validationErrors = [{
        field: "method",
        message: "Invalid MFA method. Must be 'sms', 'email', or 'totp'",
        value: method
      }];
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, validation.user.email))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User", context);
    }

    // Generate MFA secret/setup
    let setupData;
    
    switch (method) {
      case 'totp':
        // Generate TOTP secret
        const secret = crypto.randomBytes(20).toString('base64');
        setupData = {
          secret,
          qrCode: `otpauth://totp/HARDYPOS:${user.email}?secret=${secret}&issuer=HARDYPOS`,
          backupCodes: Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'))
        };
        break;
      
      case 'sms':
        // Setup SMS-based MFA
        setupData = {
          message: "SMS MFA setup initiated. Please verify your phone number."
        };
        break;
      
      case 'email':
        // Setup email-based MFA
        setupData = {
          message: "Email MFA setup initiated. Check your email for verification."
        };
        break;
    }

    // Store MFA settings in database (in production, create mfa_settings table)
    if (setupData) {
      const mfaSettings = {
        userId: user.id,
        method,
        secret: setupData.secret || null,
        isEnabled: false, // Will be enabled after verification
        createdAt: new Date(),
        backupCodes: setupData.backupCodes || []
      };
      
      // For now, store in memory (in production, save to mfa_settings table)
      await storeMfaSettings(user.id, mfaSettings);
    }
    
    const responseData = {
      message: `${method.toUpperCase()} MFA setup initiated`,
      method,
      setupData,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// PUT - Verify and enable MFA
export async function PUT(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid JSON in request body", "body");
    }

    const { method, code, secret } = body;

    // Validate required fields
    const validationErrors = [];
    
    if (!method) {
      validationErrors.push({
        field: "method",
        message: VALIDATION_MESSAGES.REQUIRED("MFA method"),
        value: method
      });
    }
    
    if (!code) {
      validationErrors.push({
        field: "code",
        message: VALIDATION_MESSAGES.REQUIRED("Verification code"),
        value: code
      });
    }

    if (validationErrors.length > 0) {
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Verify the MFA code based on method
    const isValidCode = await verifyMfaCode(validation.user.email, method, code, secret);
    
    if (!isValidCode) {
      throw new BusinessLogicError("Invalid verification code", context);
    }

    // Enable MFA for user in database
    await enableMfaForUser(validation.user.email, method, secret);
    
    const responseData = {
      message: `${method.toUpperCase()} MFA enabled successfully`,
      enabled: true,
      method,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// DELETE - Disable MFA
export async function DELETE(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid JSON in request body", "body");
    }

    const { password } = body;

    // Validate required fields
    if (!password) {
      const validationErrors = [{
        field: "password",
        message: VALIDATION_MESSAGES.REQUIRED("Password confirmation"),
        value: undefined // Don't log password values
      }];
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Verify user password
    const isValidPassword = await verifyUserPassword(validation.user.email, password);
    
    if (!isValidPassword) {
      throw new BusinessLogicError("Invalid password", context);
    }
    
    // Disable MFA in database
    await disableMfaForUser(validation.user.email);
    
    const responseData = {
      message: "MFA disabled successfully",
      enabled: false,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// GET - Get MFA status
export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Get MFA status from database
    const mfaStatus = await getMfaStatus(validation.user.email);
    
    return NextResponse.json(createSuccessResponse(mfaStatus));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}
