import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
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
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages";

// In-memory token store (in production, use database table)
const resetTokens = new Map<string, { userId: string; expiry: Date; email: string }>();

// Email service functions
async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetToken: string;
  resetLink: string;
}) {
  const { to, name, resetLink } = params;
  
  // For production, integrate with Resend, SendGrid, or similar service
  // Example with Resend:
  // const { Resend } = require('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // 
  // await resend.emails.send({
  //   from: 'POS System <noreply@yourpos.com>',
  //   to: [to],
  //   subject: 'Reset Your Password',
  //   html: getPasswordResetEmailTemplate(name, resetLink)
  // });
  
  // For now, log the email content
  console.log(`
  === PASSWORD RESET EMAIL ===
  To: ${to}
  Subject: Reset Your Password
  
  Hi ${name},
  
  Click the link below to reset your password:
  ${resetLink}
  
  This link will expire in 1 hour.
  
  If you didn't request this, please ignore this email.
  `);
}

async function verifyResetToken(token: string) {
  // In production, query password_resets table
  // const result = await db.select().from(passwordResets).where(eq(passwordResets.token, token));
  
  const tokenData = resetTokens.get(token);
  return tokenData || null;
}

async function invalidateResetToken(token: string) {
  // In production, delete from password_resets table
  // await db.delete(passwordResets).where(eq(passwordResets.token, token));
  
  resetTokens.delete(token);
}

function getPasswordResetEmailTemplate(name: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>You recently requested to reset your password for your POS System account. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">POS System - Point of Sale Management</p>
      </div>
    </body>
    </html>
  `;
}

// POST - Request password reset
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
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always return success to prevent email enumeration
    const successMessage = "If an account with that email exists, we've sent a password reset link.";
    
    if (!user) {
      return NextResponse.json(createSuccessResponse({ message: successMessage }));
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Store reset token in memory/database (in production, use password_resets table)
    resetTokens.set(resetToken, { 
      userId: user.id, 
      expiry: resetTokenExpiry, 
      email: user.email 
    });

    // Implement email sending service
    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name || 'User',
        resetToken,
        resetLink: `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
      });
      
      console.log(`Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Still return success to prevent email enumeration
    }

    const responseData = {
      message: successMessage,
      // Remove debug info in production:
      ...(process.env.NODE_ENV !== 'production' && {
        debug: {
          token: resetToken,
          expiry: resetTokenExpiry,
          resetLink: `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
        }
      })
    };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// PUT - Reset password with token
export async function PUT(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    const body = await request.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid JSON in request body", "body");
    }

    const { token, newPassword } = body;

    // Validate required fields
    const validationErrors = [];
    
    if (!token) {
      validationErrors.push({
        field: "token",
        message: VALIDATION_MESSAGES.REQUIRED("Reset token"),
        value: token
      });
    }
    
    if (!newPassword) {
      validationErrors.push({
        field: "newPassword",
        message: VALIDATION_MESSAGES.REQUIRED("New password"),
        value: undefined // Don't log password values
      });
    } else if (newPassword.length < 8) {
      validationErrors.push({
        field: "newPassword",
        message: VALIDATION_MESSAGES.MIN_LENGTH("Password", 8),
        value: undefined
      });
    }

    if (validationErrors.length > 0) {
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Verify token from password_resets table/memory store
    const tokenData = await verifyResetToken(token);
    
    if (!tokenData || !tokenData.userId) {
      throw new BusinessLogicError("Invalid or expired reset token", context);
    }
    
    if (new Date() > tokenData.expiry) {
      await invalidateResetToken(token);
      throw new BusinessLogicError("Reset token has expired", context);
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password in database
    await db
      .update(users)
      .set({ 
        passwordHash: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, tokenData.userId));

    // Invalidate the reset token
    await invalidateResetToken(token);

    const responseData = {
      message: "Password reset successfully. Please log in with your new password.",
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}
