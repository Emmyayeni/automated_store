import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { name, email, password, role, locationId } = await req.json();

    // Validate required fields
    if (!name || !email || !password || !role || !locationId) {
      return NextResponse.json(
        { error: "All fields are required: name, email, password, role, locationId" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["ADMIN", "MANAGER", "CASHIER"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN, MANAGER, or CASHIER" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists in this business
    const existingUser = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.businessId, session.user.businessId!)
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "A user with this email already exists in your business" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        businessId: session.user.businessId!,
        locationId,
        isActive: true, // User is immediately active
        createdAt: new Date(),
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        locationId: users.locationId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    if (!newUser) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Return success response with created user data (excluding password)
    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: newUser,
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error creating user:", error);

    // Handle specific database errors
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while creating the user" },
      { status: 500 }
    );
  }
}