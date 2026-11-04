import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/business/[id] - Get business by ID (public, no auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ Id: string }> }
) {
  try {
    const { Id: businessId } = await params;
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch business" }, { status: 500 });
  }
}