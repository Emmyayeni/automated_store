import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { promotions } from "@/lib/schema";
import { eq, and, desc, sql as dsql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { 
  createSuccessResponse, 
  createErrorResponse 
} from "@/lib/standards/api-responses";

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      description,
      type,
      value,
      minimumPurchase,
      maximumDiscount,
      applicableProducts,
      startDate,
      endDate,
      usageLimit,
      businessId,
      createdBy,
    } = await request.json();

    const [promotion] = await db
      .insert(promotions)
      .values({
        name,
        description,
        businessId,
        type,
        value,
        minimumPurchase,
        maximumDiscount,
        applicableProducts: JSON.stringify(applicableProducts),
        validFrom: startDate,
        validUntil: endDate,
        usageLimit,
        createdBy: createdBy ?? (await auth())?.user?.id,
      })
      .returning();

    return NextResponse.json(createSuccessResponse(promotion), { status: 201 });
  } catch (error) {
    console.error("Error creating promotion:", error);
    return NextResponse.json(createErrorResponse("Failed to create promotion"), { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const active = searchParams.get("active") === "true";

    let whereClauses: any[] = [];

    if (businessId) whereClauses.push(eq(promotions.businessId, businessId));

    if (active) {
      whereClauses.push(
        and(
          eq(promotions.isActive, true),
          dsql`${promotions.validFrom} <= CURRENT_TIMESTAMP`,
          dsql`${promotions.validUntil} >= CURRENT_TIMESTAMP`
        )
      );
    }

    const result = await db
      .select({
        id: promotions.id,
        name: promotions.name,
        description: promotions.description,
        type: promotions.type,
        value: promotions.value,
        minimumPurchase: promotions.minimumPurchase,
        maximumDiscount: promotions.maximumDiscount,
        applicableProducts: promotions.applicableProducts,
        validFrom: promotions.validFrom,
        validUntil: promotions.validUntil,
        usageLimit: promotions.usageLimit,
        usageCount: promotions.usageCount,
        isActive: promotions.isActive,
      })
      .from(promotions)
      .where(whereClauses.length ? and(...whereClauses) : undefined)
      .orderBy(desc(promotions.createdAt));

    const formattedPromotions = result.map((promo) => ({
      id: promo.id,
      name: promo.name,
      description: promo.description,
      type: promo.type,
      value: promo.value ? Number.parseFloat(promo.value as any) : null,
      minimumPurchase: promo.minimumPurchase ? Number.parseFloat(promo.minimumPurchase as any) : null,
      maximumDiscount: promo.maximumDiscount ? Number.parseFloat(promo.maximumDiscount as any) : null,
      applicableProducts: promo.applicableProducts,
      validFrom: promo.validFrom,
      validUntil: promo.validUntil,
      usageLimit: promo.usageLimit,
      usageCount: promo.usageCount,
      isActive: promo.isActive,
    }));

    return NextResponse.json(createSuccessResponse(formattedPromotions));
  } catch (error) {
    console.error("Error fetching promotions:", error);
    return NextResponse.json(createErrorResponse("Failed to fetch promotions"), { status: 500 });
  }
}