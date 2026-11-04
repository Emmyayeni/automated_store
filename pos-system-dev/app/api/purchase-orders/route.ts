import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
  users,
} from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { supplierId, businessId, locationId, createdBy, items, expectedDeliveryDate, notes } = await request.json();

    const orderNumber = `PO-${Date.now()}`;
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unitCost,
      0
    );
    const taxAmount = 0; // Calculate as needed
    const shippingCost = 0; // Calculate as needed
    const totalAmount = subtotal + taxAmount + shippingCost;

    // Create purchase order
    const [purchaseOrder] = await db
      .insert(purchaseOrders)
      .values({
        businessId,
        locationId,
        supplierId,
        orderNumber,
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        shippingCost: shippingCost.toString(),
        totalAmount: totalAmount.toString(),
        notes,
        createdBy,
      })
      .returning();

    const poId = purchaseOrder.id;

    // Create purchase order items
    for (const item of items) {
      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: poId,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost.toString(),
        totalCost: (item.quantity * item.unitCost).toString(),
      });
    }

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const businessId = searchParams.get("businessId");

    let whereClauses: any[] = [];

    if (businessId) {
      whereClauses.push(eq(purchaseOrders.businessId, businessId));
    }

    if (status) {
      whereClauses.push(eq(purchaseOrders.status, status as any));
    }

    const result = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        createdBy: purchaseOrders.createdBy,
        name: users.name,
        status: purchaseOrders.status,
        orderDate: purchaseOrders.orderDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        actualDeliveryDate: purchaseOrders.actualDeliveryDate,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
      .where(whereClauses.length ? and(...whereClauses) : undefined)
      .orderBy(desc(purchaseOrders.orderDate));

    return NextResponse.json(
      result.map((po) => ({
        id: po.id,
        orderNumber: po.orderNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        createdBy: po.createdBy,
        userName: po.name,
        status: po.status,
        orderDate: po.orderDate,
        expectedDeliveryDate: po.expectedDeliveryDate,
        actualDeliveryDate: po.actualDeliveryDate,
        totalAmount: Number.parseFloat(po.totalAmount as any),
        notes: po.notes,
      }))
    );
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}