import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loyaltyRewards } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const rewards = await db
      .select()
      .from(loyaltyRewards)
      .where(eq(loyaltyRewards.isActive, true))
      .orderBy(asc(loyaltyRewards.pointsRequired));

    return NextResponse.json(
      rewards.map((reward) => ({
        id: reward.id,
        name: reward.name,
        description: reward.description,
        pointsRequired: reward.pointsRequired,
        rewardType: reward.rewardType,
        rewardValue: reward.rewardValue ? Number.parseFloat(reward.rewardValue as any) : null,
        productId: reward.productId,
        isActive: reward.isActive,
      }))
    );
  } catch (error) {
    console.error("Error fetching loyalty rewards:", error);
    return NextResponse.json({ error: "Failed to fetch loyalty rewards" }, { status: 500 });
  }
}