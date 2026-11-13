import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  reorderSuggestions,
  products,
  suppliers,
  purchaseOrders,
} from "@/lib/schema";
import { eq, and, inArray, sql as dsql, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId") || "1b39f9f5-92d3-424f-bb03-20509f13c5e2";
    const urgency = searchParams.get("urgency");

    const allowedUrgencies = ["high", "low", "medium", "critical"] as const;
    const whereClauses = [eq(reorderSuggestions.status, "pending" as const)];

    if (locationId) {
      whereClauses.push(eq(reorderSuggestions.locationId, locationId));
    }

    if (urgency && allowedUrgencies.includes(urgency as any)) {
      whereClauses.push(
        eq(
          reorderSuggestions.priority,
          urgency as typeof allowedUrgencies[number]
        )
      );
    }

    const suggestions = await db
      .select({
        id: reorderSuggestions.id,
        productId: reorderSuggestions.productId,
        currentStock: reorderSuggestions.currentStock,
        suggestedQuantity: reorderSuggestions.suggestedQuantity,
        urgencyLevel: reorderSuggestions.priority,
        reason: reorderSuggestions.reason,
        estimatedStockoutDate: dsql<string | null>`NULL`,
        createdAt: reorderSuggestions.createdAt,
        productName: products.name,
        sku: products.sku,
        price: products.price,
        supplierName: suppliers.name,
      })
      .from(reorderSuggestions)
      .innerJoin(products, eq(reorderSuggestions.productId, products.id))
      .leftJoin(
        suppliers,
        dsql`false`
      )
      .where(and(...whereClauses))
      .orderBy(
        dsql`CASE ${reorderSuggestions.priority}
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 END`,
        desc(reorderSuggestions.createdAt)
      );

    return NextResponse.json(
      suggestions.map((suggestion) => ({
        id: suggestion.id,
        productId: suggestion.productId,
        productName: suggestion.productName,
        sku: suggestion.sku,
        currentStock: suggestion.currentStock,
        suggestedQuantity: suggestion.suggestedQuantity,
        urgencyLevel: suggestion.urgencyLevel,
        reason: suggestion.reason,
        estimatedStockoutDate: suggestion.estimatedStockoutDate,
        supplierName: suggestion.supplierName,
        estimatedCost:
          suggestion.suggestedQuantity * Number.parseFloat(String(suggestion.price || 0)),
        createdAt: suggestion.createdAt,
      }))
    );
  } catch (error) {
    console.error("Error fetching reorder suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reorder suggestions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { suggestionIds, action } = await request.json();

    if (action === "approve") {
      // Mark suggestions as processed and create purchase orders
      const suggestions = await db
        .select()
        .from(reorderSuggestions)
        .where(inArray(reorderSuggestions.id, suggestionIds));

      for (const s of suggestions) {
        // Create purchase order
        const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await db.insert(purchaseOrders).values({
          businessId: s.businessId,
          locationId: s.locationId,
          supplierId: Array.isArray(s.supplierIds) ? String(s.supplierIds[0]) : String(s.supplierIds || ""),
          orderNumber: poNumber,
          orderDate: new Date().toISOString().slice(0, 10),
          subtotal: String(s.suggestedQuantity * 10),
          totalAmount: String(s.suggestedQuantity * 10),
          createdBy: s.businessId,
          notes: "Auto-generated from reorder suggestion",
        });

        // Mark as processed
        await db
          .update(reorderSuggestions)
          .set({ status: "approved" })
          .where(eq(reorderSuggestions.id, s.id));
      }
    } else if (action === "dismiss") {
      await db
        .update(reorderSuggestions)
        .set({ status: "dismissed" })
        .where(inArray(reorderSuggestions.id, suggestionIds));
    }

    return NextResponse.json({
      success: true,
      message: `Suggestions ${action}ed successfully`,
    });
  } catch (error) {
    console.error("Error processing reorder suggestions:", error);
    return NextResponse.json(
      { error: "Failed to process suggestions" },
      { status: 500 }
    );
  }
}