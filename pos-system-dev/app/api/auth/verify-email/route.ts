import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
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
  NotFoundError 
} from "@/lib/standards/error-handling";
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages";

// In-memory token store for verification (in production, use database table)
const verificationTokens = new Map<string, { userId: string; expiry: Date; email: string }>();

// Email service functions
async function sendVerificationEmail(params: {
  to: string;
  name: string;
  verificationToken: string;
  verificationLink: string;
}) {
  const { to, name, verificationLink } = params;
  
  // For production, integrate with Resend, SendGrid, or similar service
  console.log(`
  === EMAIL VERIFICATION EMAIL ===
  To: ${to}
  Subject: Please Verify Your Email Address
  
  Hi ${name},
  
  Welcome to POS System! Please verify your email address by clicking the link below:
  ${verificationLink}
  
  This link will expire in 24 hours.
  
  If you didn't create an account, please ignore this email.
  `);
}

async function verifyEmailToken(token: string) {
  // In production, query verification_tokens table
  const tokenData = verificationTokens.get(token);
  return tokenData || null;
}

async function invalidateVerificationToken(token: string) {
  // In production, delete from verification_tokens table
  verificationTokens.delete(token);
}

function getVerificationEmailTemplate(name: string, verificationLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your Email Address</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #333; margin-bottom: 20px;">Welcome to POS System!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for creating your POS System account. To get started, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
        </div>
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>If you didn't create this account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">POS System - Point of Sale Management</p>
      </div>
    </body>
    </html>
  `;
}

// POST - Send email verification
export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    const body = await request.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid JSON in request body", "body");
    }

    const { email } = body;

    // Validate required fields
    if (!email) {
      const validationErrors = [{
        field: "email",
        message: VALIDATION_MESSAGES.REQUIRED("Email"),
        value: email
      }];
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const validationErrors = [{
        field: "email",
        message: VALIDATION_MESSAGES.INVALID_EMAIL,
        value: email
      }];
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Check if user exists
    const [user] = await db
      .select({ 
        id: users.id, 
        email: users.email, 
        name: users.name,
        isActive: users.isActive 
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User", context);
    }

    if (user.isActive) {
      const responseData = {
        message: "Email is already verified",
        isVerified: true
      };
      return NextResponse.json(createSuccessResponse(responseData));
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    // Store verification token in memory/database (in production, use verification_tokens table)
    verificationTokens.set(verificationToken, {
      userId: user.id,
      expiry: verificationExpiry,
      email: user.email
    });

    // Send verification email using email service
    try {
      await sendVerificationEmail({
        to: user.email,
        name: user.name || 'User',
        verificationToken,
        verificationLink: `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`
      });
      
      console.log(`Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      throw new BusinessLogicError("Failed to send verification email", context);
    }

    const responseData = {
      message: "Verification email sent successfully",
      // Remove debug info in production:
      ...(process.env.NODE_ENV !== 'production' && {
        debug: {
          token: verificationToken,
          verificationLink: `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`
        }
      })
    };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// PUT - Verify email with token
export async function PUT(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    const body = await request.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid JSON in request body", "body");
    }

    const { token } = body;

    // Validate required fields
    if (!token) {
      const validationErrors = [{
        field: "token",
        message: VALIDATION_MESSAGES.REQUIRED("Verification token"),
        value: token
      }];
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Implement proper token verification
    const tokenData = await verifyEmailToken(token);
    
    if (!tokenData || !tokenData.userId) {
      throw new BusinessLogicError("Invalid or expired verification token", context);
    }
    
    if (new Date() > tokenData.expiry) {
      await invalidateVerificationToken(token);
      throw new BusinessLogicError("Verification token has expired", context);
    }
    
    // Update user as verified (isActive = true)
    await db
      .update(users)
      .set({ 
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, tokenData.userId));
    
    // Invalidate the verification token
    await invalidateVerificationToken(token);

    const responseData = {
      message: "Email verified successfully. You can now log in.",
      isVerified: true,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}
