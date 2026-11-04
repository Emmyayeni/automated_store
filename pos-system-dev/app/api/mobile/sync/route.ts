import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  transactions,
  transactionItems,
  products,
  customers,
  offlineTransactions,
  mobileDevices,
} from "@/lib/schema";
import { eq, desc, and, gt, sql as dsql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { deviceId, offlineTransactions: offlineTxns, lastSyncTimestamp } = await request.json();

    const syncResults: {
      processed: number;
      failed: number;
      conflicts: number;
      serverUpdates: Record<string, unknown>[];
    } = {
      processed: 0,
      failed: 0,
      conflicts: 0,
      serverUpdates: [],
    };

    // Process offline transactions
    for (const offlineTransaction of offlineTxns) {
      try {
        // Check for conflicts (same transaction processed elsewhere)
        const existingTransaction = await db
          .select({ id: transactions.id })
          .from(transactions)
          .where(eq(transactions.transactionNumber, offlineTransaction.transactionNumber));

        if (existingTransaction.length > 0) {
          // Conflict detected
          await db.insert(offlineTransactions).values({
            deviceId,
            locationId: offlineTransaction.locationId,
            transactionData: JSON.stringify(offlineTransaction),
            createdOfflineAt: offlineTransaction.createdAt,
            syncStatus: "conflict",
            errorMessage: "Transaction already exists",
          });
          syncResults.conflicts++;
          continue;
        }

        // Process the transaction
        const [transaction] = await db
          .insert(transactions)
          .values({
            transactionNumber: offlineTransaction.transactionNumber,
            customerId: offlineTransaction.customerId,
            userId: offlineTransaction.userId,
            subtotal: offlineTransaction.subtotal,
            taxAmount: offlineTransaction.taxAmount,
            totalAmount: offlineTransaction.totalAmount,
            paymentMethod: offlineTransaction.paymentMethod,
            status: "completed",
            createdAt: offlineTransaction.createdAt,
          })
          .returning({ id: transactions.id });

        // Add transaction items
        for (const item of offlineTransaction.items) {
          await db.insert(transactionItems).values({
            transactionId: transaction.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          });

          // Update inventory
          await db
            .update(products)
            .set({
              stockQuantity: dsql`${products.stockQuantity} - ${item.quantity}`,
            })
            .where(eq(products.id, item.productId));
        }

        // Mark as synced
        await db.insert(offlineTransactions).values({
          deviceId,
          locationId: offlineTransaction.locationId,
          transactionData: JSON.stringify(offlineTransaction),
          createdOfflineAt: offlineTransaction.createdAt,
          syncStatus: "synced",
        });

        syncResults.processed++;
      } catch (error: any) {
        if (error instanceof Error) {
          console.error("Error processing offline transaction:", error);
          await db.insert(offlineTransactions).values({
            deviceId,
            locationId: offlineTransaction.locationId,
            transactionData: JSON.stringify(offlineTransaction),
            createdOfflineAt: offlineTransaction.createdAt,
            syncStatus: "failed",
            errorMessage: error.message,
          });
        } else {
          console.error("Error processing offline transaction:", error);
          await db.insert(offlineTransactions).values({
            deviceId,
            locationId: offlineTransaction.locationId,
            transactionData: JSON.stringify(offlineTransaction),
            createdOfflineAt: offlineTransaction.createdAt,
            syncStatus: "failed",
            errorMessage: String(error),
          });
        }
        syncResults.failed++;
      }
    }

    // Get server updates since last sync
    if (lastSyncTimestamp) {
      const serverUpdates = await db.execute(
        dsql`
          SELECT 'product' as type, id, name, price, stock_quantity, updated_at
          FROM products
          WHERE updated_at > ${lastSyncTimestamp}
            AND is_active = true
          UNION ALL
          SELECT 'customer' as type, id, first_name as name, email as price, loyalty_points as stock_quantity, updated_at
          FROM customers
          WHERE updated_at > ${lastSyncTimestamp}
          ORDER BY updated_at DESC
          LIMIT 100
        `
      ) as { rows: Record<string, unknown>[] } | Record<string, unknown>[];

      syncResults.serverUpdates = Array.isArray((serverUpdates as any).rows)
        ? (serverUpdates as { rows: Record<string, unknown>[] }).rows
        : (serverUpdates as Record<string, unknown>[]);
    }

    // Update device last seen
    await db
      .update(mobileDevices)
      .set({ lastSeen: new Date() })
      .where(eq(mobileDevices.deviceId, deviceId));

    return NextResponse.json({
      success: true,
      syncResults,
      serverTimestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Mobile sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json({ error: "Device ID required" }, { status: 400 });
    }

    // Get sync status for device
    const [syncStatus] = await db.execute(
      dsql`
        SELECT 
          COUNT(*) as total_offline,
          COUNT(*) FILTER (WHERE sync_status = 'pending') as pending,
          COUNT(*) FILTER (WHERE sync_status = 'failed') as failed,
          COUNT(*) FILTER (WHERE sync_status = 'conflict') as conflicts,
          MAX(created_at) as last_sync
        FROM offline_transactions
        WHERE device_id = ${deviceId}
      `
    ).then((res: any) => res.rows ?? res);

    return NextResponse.json({
      deviceId,
      syncStatus,
    });
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json({ error: "Failed to get sync status" }, { status: 500 });
  }
}