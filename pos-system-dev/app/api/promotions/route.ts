import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { promotions, storeLocations } from "@/lib/schema";
import { eq, or, and, desc, sql as dsql } from "drizzle-orm";
import { 
  createSuccessResponse, 
  createErrorResponse 
} from "@/lib/standards/api-responses";

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      description,
      promotionType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      buyQuantity,
      getQuantity,
      applicableProducts,
      applicableCategories,
      startDate,
      endDate,
      usageLimit,
      locationId,
    } = await request.json();

    const [promotion] = await db
      .insert(promotions)
      .values({
        name,
        description,
        promotionType,
        discountValue,
        minPurchaseAmount,
        maxDiscountAmount,
        buyQuantity,
        getQuantity,
        applicableProducts: JSON.stringify(applicableProducts),
        applicableCategories: JSON.stringify(applicableCategories),
        startDate,
        endDate,
        usageLimit,
        locationId,
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
    const locationId = searchParams.get("locationId");
    const active = searchParams.get("active") === "true";

    let whereClauses: any[] = [];

    if (locationId) {
      whereClauses.push(
        or(
          eq(promotions.locationId, locationId),
          eq(promotions.locationId, null)
        )
      );
    }

    if (active) {
      whereClauses.push(
        and(
          eq(promotions.isActive, true),
          dsql`${promotions.startDate} <= CURRENT_TIMESTAMP`,
          dsql`${promotions.endDate} >= CURRENT_TIMESTAMP`
        )
      );
    }

    const result = await db
      .select({
        id: promotions.id,
        name: promotions.name,
        description: promotions.description,
        promotionType: promotions.promotionType,
        discountValue: promotions.discountValue,
        minPurchaseAmount: promotions.minPurchaseAmount,
        maxDiscountAmount: promotions.maxDiscountAmount,
        buyQuantity: promotions.buyQuantity,
        getQuantity: promotions.getQuantity,
        applicableProducts: promotions.applicableProducts,
        applicableCategories: promotions.applicableCategories,
        startDate: promotions.startDate,
        endDate: promotions.endDate,
        usageLimit: promotions.usageLimit,
        usageCount: promotions.usageCount,
        isActive: promotions.isActive,
        locationId: promotions.locationId,
        locationName: storeLocations.name,
      })
      .from(promotions)
      .leftJoin(storeLocations, eq(promotions.locationId, storeLocations.id))
      .where(whereClauses.length ? and(...whereClauses) : undefined)
      .orderBy(desc(promotions.createdAt));

    const formattedPromotions = result.map((promo) => ({
      id: promo.id,
      name: promo.name,
      description: promo.description,
      promotionType: promo.promotionType,
      discountValue: promo.discountValue ? Number.parseFloat(promo.discountValue as any) : null,
      minPurchaseAmount: promo.minPurchaseAmount ? Number.parseFloat(promo.minPurchaseAmount as any) : null,
      maxDiscountAmount: promo.maxDiscountAmount ? Number.parseFloat(promo.maxDiscountAmount as any) : null,
      buyQuantity: promo.buyQuantity,
      getQuantity: promo.getQuantity,
      applicableProducts: promo.applicableProducts,
      applicableCategories: promo.applicableCategories,
      startDate: promo.startDate,
      endDate: promo.endDate,
      usageLimit: promo.usageLimit,
      usageCount: promo.usageCount,
      isActive: promo.isActive,
      locationId: promo.locationId,
      locationName: promo.locationName,
    }));

    return NextResponse.json(createSuccessResponse(formattedPromotions));
  } catch (error) {
    console.error("Error fetching promotions:", error);
    return NextResponse.json(createErrorResponse("Failed to fetch promotions"), { status: 500 });
  }
}