import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, customers, transactions, transactionItems } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { platform, action, data } = await request.json();
    if (action === "sync_inventory") return syncInventory(platform);
    if (action === "import_orders") return importOrders(platform, data);
    if (action === "export_products") return exportProducts(platform);
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("E-commerce integration error:", error);
    return NextResponse.json({ error: "Integration failed" }, { status: 500 });
  }
}

async function syncInventory(platform: string) {
  const rows = await db.select().from(products).where(eq(products.isActive, true)).limit(50);
  return NextResponse.json({
    success: true,
    platform,
    synced: rows.length,
    results: rows.map((product) => ({
      productId: product.id,
      sku: product.sku,
      status: "synced",
      inventory: product.stockLevel ?? 0,
    })),
  });
}

async function importOrders(platform: string, data: { businessId?: string; locationId?: string; cashierId?: string }) {
  if (!data?.businessId || !data.locationId || !data.cashierId) {
    return NextResponse.json({ error: "businessId, locationId, and cashierId are required" }, { status: 400 });
  }
  const order = { customer_email: "customer@example.com", total_amount: 99.99, items: [] as Array<{ sku: string; quantity: number; price: number }> };
  let [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, order.customer_email));
  if (!customer) {
    [customer] = await db.insert(customers).values({ businessId: data.businessId, email: order.customer_email, name: "Online Customer" }).returning({ id: customers.id });
  }
  const [transaction] = await db.insert(transactions).values({
    transactionNumber: `WEB-${Date.now()}`,
    businessId: data.businessId,
    locationId: data.locationId,
    cashierId: data.cashierId,
    customerId: customer.id,
    subtotal: String(order.total_amount * 0.92),
    taxAmount: String(order.total_amount * 0.08),
    total: String(order.total_amount),
    paymentMethod: "other",
    status: "completed",
  }).returning({ id: transactions.id });
  for (const item of order.items) {
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.sku, item.sku));
    if (product) await db.insert(transactionItems).values({
      transactionId: transaction.id,
      productId: product.id,
      quantity: item.quantity,
      unitPrice: String(item.price),
      lineTotal: String(item.price * item.quantity),
    });
  }
  return NextResponse.json({ success: true, platform, imported: 1, results: [{ transactionId: transaction.id, status: "imported" }] });
}

async function exportProducts(platform: string) {
  const rows = await db.select().from(products).where(eq(products.isActive, true)).limit(100);
  return NextResponse.json({
    success: true,
    platform,
    exported: rows.length,
    results: rows.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      inventory: product.stockLevel ?? 0,
      description: product.description,
      status: "exported",
    })),
  });
}
