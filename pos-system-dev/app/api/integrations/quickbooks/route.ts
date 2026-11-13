import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, customers, products, syncLogs, integrationConfigs } from "@/lib/schema";
import { eq, desc, sql as dsql, and, gte } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case "sync_transactions":
        return await syncTransactions(data);
      case "sync_customers":
        return await syncCustomers(data);
      case "sync_products":
        return await syncProducts(data);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("QuickBooks integration error:", error);
    return NextResponse.json({ error: "Integration failed" }, { status: 500 });
  }
}

async function syncTransactions(data: any) {
  // Get completed transactions from the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const txns = await db
    .select({
      id: transactions.id,
      transactionNumber: transactions.transactionNumber,
      totalAmount: transactions.total,
      createdAt: transactions.createdAt,
      status: transactions.status,
      customerId: transactions.customerId,
      customerName: customers.name,
      email: customers.email,
    })
    .from(transactions)
    .leftJoin(customers, eq(transactions.customerId, customers.id))
    .where(
      and(
        gte(transactions.createdAt, sevenDaysAgo),
        eq(transactions.status, "completed")
      )
    )
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  const syncResults = [];

  for (const transaction of txns) {
    // Mock QuickBooks API call
    const qbTransaction = {
      id: `qb_${transaction.id}`,
      amount: Number.parseFloat(transaction.totalAmount as any),
      date: transaction.createdAt,
      customer: transaction.customerName
        ? transaction.customerName
        : "Walk-in Customer",
      reference: transaction.transactionNumber,
    };

    syncResults.push({
      posTransactionId: transaction.id,
      qbTransactionId: qbTransaction.id,
      status: "synced",
      amount: qbTransaction.amount,
    });

    // Log sync
    const [integration] = await db
      .select({ id: integrationConfigs.id })
      .from(integrationConfigs)
      .where(eq(integrationConfigs.integrationType, "quickbooks"))
      .limit(1);

    if (integration) {
      await db.insert(syncLogs).values({
        integrationConfigId: integration.id,
        syncType: "manual",
        recordsProcessed: 1,
        status: "completed",
      });
    }
  }

  return NextResponse.json({
    success: true,
    synced: syncResults.length,
    results: syncResults,
  });
}

async function syncCustomers(data: any) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const custs = await db
    .select()
    .from(customers)
    .where(gte(customers.updatedAt, sevenDaysAgo))
    .orderBy(desc(customers.updatedAt))
    .limit(50);

  const syncResults = custs.map((customer: typeof customers.$inferSelect) => ({
    posCustomerId: customer.id,
    qbCustomerId: `qb_cust_${customer.id}`,
    name: customer.name || "",
    email: customer.email,
    status: "synced",
  }));

  return NextResponse.json({
    success: true,
    synced: syncResults.length,
    results: syncResults,
  });
}

async function syncProducts(data: any) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const prods = await db
    .select()
    .from(products)
    .where(
      and(
        gte(products.updatedAt, sevenDaysAgo),
        eq(products.isActive, true)
      )
    )
    .orderBy(desc(products.updatedAt))
    .limit(100);

  const syncResults = prods.map((product) => ({
    posProductId: product.id,
    qbItemId: `qb_item_${product.id}`,
    name: product.name,
    sku: product.sku,
    price: Number.parseFloat(product.price as any),
    status: "synced",
  }));

  return NextResponse.json({
    success: true,
    synced: syncResults.length,
    results: syncResults,
  });
}