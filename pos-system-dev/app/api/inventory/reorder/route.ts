import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { inventory, products, locations, suppliers, purchaseOrders, purchaseOrderItems } from "@/lib/schema";
import { eq, lt, and, desc, sql } from "drizzle-orm";

// GET - Get reorder suggestions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const locationId = url.searchParams.get('locationId');
    const threshold = Number.parseInt(url.searchParams.get('threshold') || '0');

    let query = db
      .select({
        inventoryId: inventory.id,
        productId: inventory.productId,
        productName: products.name,
        productSku: products.sku,
        currentQuantity: inventory.quantity,
        minStockLevel: inventory.minStockLevel,
        maxStockLevel: inventory.maxStockLevel,
        reorderQuantity: sql`${inventory.maxStockLevel} - ${inventory.quantity}`,
        locationId: inventory.locationId,
        locationName: locations.name,
        costPrice: inventory.costPrice,
        sellPrice: inventory.sellPrice,
        lastSaleDate: sql`(
          SELECT MAX(t.created_at) 
          FROM transactions t 
          JOIN transaction_items ti ON t.id = ti.transaction_id 
          WHERE ti.product_id = ${inventory.productId}
        )`,
        averageDailySales: sql`(
          SELECT COALESCE(AVG(daily_sales), 0) FROM (
            SELECT DATE(t.created_at) as sale_date, SUM(ti.quantity) as daily_sales
            FROM transactions t 
            JOIN transaction_items ti ON t.id = ti.transaction_id 
            WHERE ti.product_id = ${inventory.productId}
              AND t.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(t.created_at)
          ) daily_avg
        )`,
        daysUntilStockOut: sql`(
          CASE 
            WHEN (
              SELECT COALESCE(AVG(daily_sales), 0) FROM (
                SELECT DATE(t.created_at) as sale_date, SUM(ti.quantity) as daily_sales
                FROM transactions t 
                JOIN transaction_items ti ON t.id = ti.transaction_id 
                WHERE ti.product_id = ${inventory.productId}
                  AND t.created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(t.created_at)
              ) daily_avg
            ) > 0 
            THEN ${inventory.quantity} / (
              SELECT COALESCE(AVG(daily_sales), 1) FROM (
                SELECT DATE(t.created_at) as sale_date, SUM(ti.quantity) as daily_sales
                FROM transactions t 
                JOIN transaction_items ti ON t.id = ti.transaction_id 
                WHERE ti.product_id = ${inventory.productId}
                  AND t.created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(t.created_at)
              ) daily_avg
            )
            ELSE 999
          END
        )`,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .innerJoin(locations, eq(inventory.locationId, locations.id))
      .where(
        and(
          eq(products.isActive, true),
          sql`${inventory.quantity} <= ${inventory.minStockLevel} + ${threshold}`
        )
      );

    const reorderSuggestions = await query
      .orderBy(sql`${inventory.quantity} - ${inventory.minStockLevel}`)
      .limit(100);

    return NextResponse.json({
      suggestions: reorderSuggestions,
      count: reorderSuggestions.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Reorder suggestions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create automatic purchase orders from reorder suggestions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { locationId, supplierIds, autoApprove = false } = await request.json();

    if (!locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    // Get reorder suggestions for the location
    const reorderItems = await db
      .select({
        productId: inventory.productId,
        productName: products.name,
        productSku: products.sku,
        currentQuantity: inventory.quantity,
        minStockLevel: inventory.minStockLevel,
        maxStockLevel: inventory.maxStockLevel,
        reorderQuantity: sql`${inventory.maxStockLevel} - ${inventory.quantity}`,
        costPrice: inventory.costPrice,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(
        and(
          eq(inventory.locationId, locationId),
          eq(products.isActive, true),
          sql`${inventory.quantity} <= ${inventory.minStockLevel}`
        )
      );

    if (reorderItems.length === 0) {
      return NextResponse.json({ 
        message: "No items need reordering",
        purchaseOrders: []
      });
    }

    // Group items by supplier
    const itemsBySupplier = reorderItems.reduce((acc, item) => {
      const supplierId = supplierIds?.[0] || 'default';
      if (!acc[supplierId]) {
        acc[supplierId] = [];
      }
      acc[supplierId].push(item);
      return acc;
    }, {} as Record<string, typeof reorderItems>);

    const createdPurchaseOrders = [];

    // Create purchase orders for each supplier
    for (const [supplierId, items] of Object.entries(itemsBySupplier)) {
      if (supplierIds && !supplierIds.includes(supplierId)) {
        continue; // Skip if specific suppliers were requested and this isn't one
      }

      const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const totalAmount = items.reduce((sum, item) => 
        sum + (Number(item.costPrice) || 0) * Number(item.reorderQuantity), 0
      );

      // Create purchase order
      const [purchaseOrder] = await db
        .insert(purchaseOrders)
        .values({
          businessId: (session.user as { businessId?: string }).businessId || "",
          orderNumber,
          locationId,
          supplierId: supplierId !== 'default' ? supplierId : (supplierIds?.[0] ?? ""),
          status: autoApprove ? 'approved' : 'pending',
          totalAmount: totalAmount.toString(),
          subtotal: totalAmount.toString(),
          orderDate: new Date().toISOString().slice(0, 10),
          createdBy: session.user.id || "",
          approvedAt: autoApprove ? new Date() : null,
          notes: 'Auto-generated from reorder suggestions'
        })
        .returning();

      // Add items to purchase order
      const orderItems = items.map(item => ({
        purchaseOrderId: purchaseOrder.id,
        productId: item.productId,
        quantity: Number(item.reorderQuantity),
        unitCost: item.costPrice || '0',
        totalCost: ((Number(item.costPrice) || 0) * Number(item.reorderQuantity)).toString()
      }));

      await db.insert(purchaseOrderItems).values(orderItems);

      createdPurchaseOrders.push({
        id: purchaseOrder.id,
        orderNumber: purchaseOrder.orderNumber,
        supplierId,
        itemCount: items.length,
        totalAmount,
        status: purchaseOrder.status
      });
    }

    return NextResponse.json({
      message: `Created ${createdPurchaseOrders.length} purchase orders`,
      purchaseOrders: createdPurchaseOrders
    });

  } catch (error) {
    console.error("Auto purchase order creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
