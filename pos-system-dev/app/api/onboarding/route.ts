import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, locations, users } from "@/lib/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Helper to validate required fields
function validateFormData(data: any) {
  const required = [
    "businessName", // <-- now required
    "storeName", "storeCode", "storeEmail", "storePhone", "storeAddress",
    "businessCategory", "adminFirstName", "adminLastName", "adminEmail", "adminPassword",
    "currency", "timezone"
  ];
  for (const field of required) {
    if (!data[field] || typeof data[field] !== "string" || !data[field].trim()) {
      return `Missing or invalid field: ${field}`;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Validate input
    const error = validateFormData(data);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Check if business already exists (by businessName)
    const existingBusiness = await db
      .select()
      .from(businesses)
      .where(eq(businesses.name, data.businessName))
      .limit(1);

    if (existingBusiness.length > 0) {
      return NextResponse.json({ error: "Business already exists." }, { status: 409 });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.adminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Admin email already in use." }, { status: 409 });
    }

    // Create business (use businessName)
    const [business] = await db
      .insert(businesses)
      .values({
        name: data.businessName,
        logoUrl: null,
        industry: data.businessCategory,
      })
      .returning();

    if (!business || !business.id) {
      return NextResponse.json({ error: "Failed to create business." }, { status: 500 });
    }

    // Create location
    const [location] = await db
      .insert(locations)
      .values({
        businessId: business.id,
        name: data.storeName,
        address: data.storeAddress,
        phone: data.storePhone,
        email: data.storeEmail,
        timezone: data.timezone,
        currency: data.currency,
        status: "active",
      })
      .returning();

    if (!location || !location.id) {
      return NextResponse.json({ error: "Failed to create location." }, { status: 500 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    // Create admin user
    await db.insert(users).values({
      email: data.adminEmail,
      name: `${data.adminFirstName} ${data.adminLastName}`,
      passwordHash,
      role: "ADMIN",
      businessId: business.id,
      locationId: location.id,
      isActive: true,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}