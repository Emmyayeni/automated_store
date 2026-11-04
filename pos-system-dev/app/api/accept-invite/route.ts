import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { staffInvites, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// GET: Validate invite token and return invite info
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing invite token" }, { status: 400 });
  }
  const [invite] = await db.select().from(staffInvites).where(eq(staffInvites.token, token)).limit(1);
  if (!invite || invite.accepted) {
    return NextResponse.json({ error: "Invalid or expired invite token" }, { status: 400 });
  }
  // Optionally check for expiry here
  return NextResponse.json({
    email: invite.email,
    role: invite.role,
  });
}

// POST: Accept invite and create user
export async function POST(req: NextRequest) {
  try {
    const { token, password, name } = await req.json();
    if (!token || !password || !name) {
      return NextResponse.json({ error: "Token, name, and password required" }, { status: 400 });
    }
    
    const [invite] = await db.select().from(staffInvites).where(eq(staffInvites.token, token)).limit(1);
    if (!invite || invite.accepted) {
      return NextResponse.json({ error: "Invalid or expired invite token" }, { status: 400 });
    }
    
    // Optionally check for expiry here
    const passwordHash = await bcrypt.hash(password, 10);
    
    try {
      await db.insert(users).values({
        email: invite.email,
        name,
        passwordHash,
        role: invite.role,
        businessId: invite.businessId,
        locationId: invite.locationId,
        isActive: true,
      });
      
      await db.update(staffInvites).set({ accepted: true }).where(eq(staffInvites.id, invite.id));
      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      // Handle specific database errors
      if (dbError.code === '23505' && dbError.constraint === 'users_email_unique') {
        return NextResponse.json(
          { error: "An account with this email already exists. Please contact your administrator." }, 
          { status: 409 }
        );
      }
      
      // Handle other database constraint errors
      if (dbError.code?.startsWith('23')) {
        return NextResponse.json(
          { error: "There was a database constraint violation. Please contact support." }, 
          { status: 400 }
        );
      }
      
      // Re-throw other database errors to be caught by outer try-catch
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error accepting invite:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." }, 
      { status: 500 }
    );
  }
}