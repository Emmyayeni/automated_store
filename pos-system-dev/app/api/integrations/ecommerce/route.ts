import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, ecommerceProducts, customers, transactions, transactionItems } from "@/lib/schema";
import { eq, and, sql as dsql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { platform, action, data } = await request.json();

    switch (action) {
      case "sync_inventory":
        return await syncInventory(platform, data);
      case "import_orders":
        return await importOrders(platform, data);
      case "export_products":
        return await exportProducts(platform, data);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("E-commerce integration error:", error);
    return NextResponse.json({ error: "Integration failed" }, { status: 500 });
  }
}

async function syncInventory(platform: string, data: any) {
  // Get products that need inventory sync
  const productsToSync = await db
    .select({
      ...products,
      externalId: ecommerceProducts.externalId,
      lastSynced: ecommerceProducts.lastSynced,
    })
    .from(products)
    .leftJoin(
      ecommerceProducts,
      and(
        eq(products.id, ecommerceProducts.productId),
        eq(ecommerceProducts.platform, platform)
      )
    )
    .where(
      and(
        eq(products.isActive, true),
        dsql`(${ecommerceProducts.lastSynced} IS NULL OR ${ecommerceProducts.lastSynced} < ${products.updatedAt})`
      )
    )
    .limit(50);

  const syncResults = [];

  for (const product of productsToSync) {
    // Mock e-commerce platform API call
    const syncData = {
      sku: product.sku,
      inventory_quantity: product.stockQuantity,
      price: Number.parseFloat(product.price as any),
      last_updated: new Date().toISOString(),
    };

    // Update or create ecommerce_products record
    await db
      .insert(ecommerceProducts)
      .values({
        productId: product.id,
        platform,
        externalId: product.externalId || `ext_${product.id}`,
        syncStatus: "synced",
        lastSynced: new Date(),
        syncData: JSON.stringify(syncData),
      })
      .onConflictDoUpdate({
        target: [ecommerceProducts.productId, ecommerceProducts.platform],
        set: {
          syncStatus: "synced",
          lastSynced: new Date(),
          syncData: JSON.stringify(syncData),
        },
      });

    syncResults.push({
      productId: product.id,
      sku: product.sku,
      status: "synced",
      inventory: product.stockQuantity,
    });
  }

  return NextResponse.json({
    success: true,
    platform,
    synced: syncResults.length,
    results: syncResults,
  });
}

async function importOrders(platform: string, data: any) {
  // Mock importing orders from e-commerce platform
  const mockOrders = [
    {
      external_order_id: "order_123",
      customer_email: "customer@example.com",
      total_amount: 99.99,
      items: [{ sku: "WH001", quantity: 1, price: 99.99 }],
    },
    {
      external_order_id: "order_124",
      customer_email: "customer2@example.com",
      total_amount: 19.99,
      items: [{ sku: "TS001", quantity: 1, price: 19.99 }],
    },
  ];

  const importResults = [];

  for (const order of mockOrders) {
    // Find or create customer
    let customer = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, order.customer_email));

    if (customer.length === 0) {
      [customer] = await db
        .insert(customers)
        .values({
          email: order.customer_email,
          firstName: "Online",
          lastName: "Customer",
        })
        .returning({ id: customers.id });
    } else {
      customer = customer[0];
    }

    // Create transaction
    const transactionNumber = `WEB-${order.external_order_id}`;
    const [transaction] = await db
      .insert(transactions)
      .values({
        transactionNumber,
        customerId: customer.id,
        userId: "system",
        subtotal: order.total_amount * 0.92,
        taxAmount: order.total_amount * 0.08,
        totalAmount: order.total_amount,
        paymentMethod: "online",
        status: "completed",
      })
      .returning({ id: transactions.id });

    // Add transaction items
    for (const item of order.items) {
      const product = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.sku, item.sku));

      if (product.length > 0) {
        await db.insert(transactionItems).values({
          transactionId: transaction.id,
          productId: product[0].id,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
        });
      }
    }

    importResults.push({
      externalOrderId: order.external_order_id,
      transactionId: transaction.id,
      status: "imported",
    });
  }

  return NextResponse.json({
    success: true,
    platform,
    imported: importResults.length,
    results: importResults,
  });
}

async function exportProducts(platform: string, data: any) {
  const exportedProducts = await db
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(dsql`${products.createdAt} DESC`)
    .limit(100);

  const exportResults = exportedProducts.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: Number.parseFloat(product.price as any),
    inventory: product.stockQuantity,
    description: product.description,
    status: "exported",
  }));

  return NextResponse.json({
    success: true,
    platform,
    exported: exportResults.length,
    results: exportResults,
  });
}