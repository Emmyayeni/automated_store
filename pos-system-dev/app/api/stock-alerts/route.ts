import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stockAlerts, products } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { 
  createSuccessResponse, 
  createErrorResponse 
} from "@/lib/standards/api-responses";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get("resolved") === "true";

    const alerts = await db
      .select({
        id: stockAlerts.id,
        productId: stockAlerts.productId,
        alertType: stockAlerts.alertType,
        currentStock: stockAlerts.currentStock,
        threshold: stockAlerts.threshold,
        isResolved: stockAlerts.isResolved,
        createdAt: stockAlerts.createdAt,
        resolvedAt: stockAlerts.resolvedAt,
        productName: products.name,
        sku: products.sku,
      })
      .from(stockAlerts)
      .join(products, eq(stockAlerts.productId, products.id))
      .where(eq(stockAlerts.isResolved, resolved))
      .orderBy(desc(stockAlerts.createdAt));

    const formattedAlerts = alerts.map((alert) => ({
      id: alert.id,
      productId: alert.productId,
      productName: alert.productName,
      sku: alert.sku,
      alertType: alert.alertType,
      currentStock: alert.currentStock,
      threshold: alert.threshold,
      isResolved: alert.isResolved,
      createdAt: alert.createdAt,
      resolvedAt: alert.resolvedAt,
    }));

    return NextResponse.json(createSuccessResponse(formattedAlerts));
  } catch (error) {
    console.error("Error fetching stock alerts:", error);
    return NextResponse.json(createErrorResponse("Failed to fetch stock alerts"), { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { alertId, resolved } = await request.json();

    const [alert] = await db
      .update(stockAlerts)
      .set({
        isResolved: resolved,
        resolvedAt: resolved ? new Date() : null,
      })
      .where(eq(stockAlerts.id, alertId))
      .returning();

    return NextResponse.json(createSuccessResponse(alert));
  } catch (error) {
    console.error("Error updating stock alert:", error);
    return NextResponse.json(createErrorResponse("Failed to update stock alert"), { status: 500 });
  }
}