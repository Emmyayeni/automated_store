/**
 * Transfer Service — Blueprint Section 7.5
 *
 * Implements the full stock transfer workflow:
 * REQUESTED → APPROVED → IN_TRANSIT → RECEIVED (also REJECTED)
 *
 * Critical rules:
 * - Source stock deducted at DISPATCH only (BR-10)
 * - Destination stock increased at RECEIPT only (BR-11)
 * - Dispatched and received quantities tracked separately
 * - Discrepancies recorded (missing/damaged in transit)
 * - All multi-record operations are transactional (Section 8)
 * - Idempotency checks prevent duplicate dispatch/receipt
 */

import { db } from "@/lib/db";
import {
  inventory,
  inventoryTransfers,
  inventoryTransferItems,
  stockMovements,
  inventoryAuditLogs,
  products,
  locations,
} from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import type { ServiceResult } from "./inventory.service";

// ---- Types ----

export type TransferItemInput = {
  productId: string;
  quantity: number;
};

export type CreateTransferInput = {
  userId: string;
  fromLocationId: string;
  toLocationId: string;
  items: TransferItemInput[];
  notes?: string;
};

export type ReceiveItemInput = {
  transferItemId: string;
  productId: string;
  quantityReceived: number;
  discrepancyReason?: string;
};

// ============================================================
// CREATE TRANSFER REQUEST (Blueprint 7.5 — createTransfer)
// ============================================================
export async function createTransfer(
  input: CreateTransferInput
): Promise<ServiceResult<{ transferId: string; transferNumber: string }>> {
  const { userId, fromLocationId, toLocationId, items, notes } = input;

  // --- Validation ---
  if (fromLocationId === toLocationId) {
    return { success: false, error: "Source and destination branches must be different." };
  }
  if (!items || items.length === 0) {
    return { success: false, error: "Transfer must include at least one product." };
  }
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { success: false, error: "All item quantities must be positive integers." };
    }
  }

  // Check both branches exist
  const [fromBranch] = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, fromLocationId), eq(locations.status, "active")))
    .limit(1);
  if (!fromBranch) return { success: false, error: "Source branch not found or inactive." };

  const [toBranch] = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, toLocationId), eq(locations.status, "active")))
    .limit(1);
  if (!toBranch) return { success: false, error: "Destination branch not found or inactive." };

  try {
    let transferId = "";
    let transferNumber = "";

    await db.transaction(async (tx) => {
      // Generate unique transfer number: TR-YYYYMMDD-XXXX
      const count = await tx
        .select({ count: sql<number>`COUNT(*)` })
        .from(inventoryTransfers);
      const seq = String((Number(count[0]?.count ?? 0) + 1)).padStart(4, "0");
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      transferNumber = `TR-${dateStr}-${seq}`;

      const [transfer] = await tx
        .insert(inventoryTransfers)
        .values({
          transferNumber,
          fromLocationId,
          toLocationId,
          requestedBy: userId,
          status: "REQUESTED",
          notes: notes ?? null,
        })
        .returning();

      transferId = transfer.id;

      // Insert transfer line items
      await tx.insert(inventoryTransferItems).values(
        items.map((item) => ({
          transferId: transfer.id,
          productId: item.productId,
          quantityRequested: item.quantity,
          quantityDispatched: 0,
          quantityReceived: 0,
          discrepancyQty: 0,
        }))
      );

      await tx.insert(inventoryAuditLogs).values({
        userId,
        locationId: fromLocationId,
        action: "TRANSFER_REQUESTED",
        entityType: "transfer",
        entityId: transfer.id,
        newValues: { transferNumber, fromLocationId, toLocationId, itemCount: items.length },
      });
    });

    return {
      success: true,
      data: { transferId, transferNumber },
      message: `Transfer ${transferNumber} created and awaiting approval.`,
    };
  } catch (err) {
    console.error("[CreateTransfer Error]", err);
    return { success: false, error: "Failed to create transfer. Transaction rolled back." };
  }
}

// ============================================================
// APPROVE TRANSFER (Blueprint 7.5 — approveTransfer)
// ============================================================
export async function approveTransfer(
  managerId: string,
  transferId: string
): Promise<ServiceResult> {
  try {
    await db.transaction(async (tx) => {
      const [transfer] = await tx
        .select()
        .from(inventoryTransfers)
        .where(eq(inventoryTransfers.id, transferId))
        .for("update")
        .limit(1);

      if (!transfer) throw new Error("Transfer not found.");
      if (transfer.status !== "REQUESTED") {
        throw new Error(`Cannot approve a transfer with status: ${transfer.status}`);
      }

      await tx
        .update(inventoryTransfers)
        .set({
          status: "APPROVED",
          approvedBy: managerId,
          approvedDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inventoryTransfers.id, transferId));

      await tx.insert(inventoryAuditLogs).values({
        userId: managerId,
        locationId: transfer.fromLocationId,
        action: "TRANSFER_APPROVED",
        entityType: "transfer",
        entityId: transferId,
        oldValues: { status: "REQUESTED" },
        newValues: { status: "APPROVED" },
      });
    });

    return { success: true, data: undefined, message: "Transfer approved." };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to approve transfer." };
  }
}

// ============================================================
// REJECT TRANSFER
// ============================================================
export async function rejectTransfer(
  managerId: string,
  transferId: string,
  reason: string
): Promise<ServiceResult> {
  try {
    await db.transaction(async (tx) => {
      const [transfer] = await tx
        .select()
        .from(inventoryTransfers)
        .where(eq(inventoryTransfers.id, transferId))
        .for("update")
        .limit(1);

      if (!transfer) throw new Error("Transfer not found.");
      if (transfer.status !== "REQUESTED") {
        throw new Error(`Cannot reject a transfer with status: ${transfer.status}`);
      }

      await tx
        .update(inventoryTransfers)
        .set({
          status: "REJECTED",
          approvedBy: managerId,
          approvedDate: new Date(),
          rejectionReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(inventoryTransfers.id, transferId));

      await tx.insert(inventoryAuditLogs).values({
        userId: managerId,
        locationId: transfer.fromLocationId,
        action: "TRANSFER_REJECTED",
        entityType: "transfer",
        entityId: transferId,
        newValues: { status: "REJECTED", reason },
      });
    });

    return { success: true, data: undefined, message: "Transfer rejected." };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to reject transfer." };
  }
}

// ============================================================
// DISPATCH TRANSFER (Blueprint 7.5 — dispatchTransfer)
// Deducts stock from source branch at dispatch (BR-10).
// ============================================================
export async function dispatchTransfer(
  dispatchUserId: string,
  transferId: string
): Promise<ServiceResult> {
  try {
    await db.transaction(async (tx) => {
      // Lock transfer row
      const [transfer] = await tx
        .select()
        .from(inventoryTransfers)
        .where(eq(inventoryTransfers.id, transferId))
        .for("update")
        .limit(1);

      if (!transfer) throw new Error("Transfer not found.");
      if (transfer.status !== "APPROVED") {
        throw new Error(`Cannot dispatch a transfer with status: ${transfer.status}`);
      }

      // Get transfer items
      const items = await tx
        .select()
        .from(inventoryTransferItems)
        .where(eq(inventoryTransferItems.transferId, transferId));

      // Deduct stock from source for each item (BR-10)
      for (const item of items) {
        // Lock source inventory row
        const [sourceInventory] = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.locationId, transfer.fromLocationId),
              eq(inventory.productId, item.productId)
            )
          )
          .for("update")
          .limit(1);

        if (!sourceInventory || sourceInventory.quantity < item.quantityRequested) {
          const [prod] = await tx
            .select({ name: products.name })
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);
          throw new Error(
            `Insufficient stock for "${prod?.name ?? item.productId}". ` +
              `Available: ${sourceInventory?.quantity ?? 0}, Requested: ${item.quantityRequested}`
          );
        }

        const balanceBefore = sourceInventory.quantity;
        const newBalance = balanceBefore - item.quantityRequested;
        const reorderLevel = sourceInventory.reorderLevel ?? 10;
        const stockStatus =
          newBalance === 0 ? "OUT_OF_STOCK" : newBalance <= reorderLevel ? "LOW_STOCK" : "NORMAL";

        // Deduct from source branch
        await tx
          .update(inventory)
          .set({ quantity: newBalance, stockStatus: stockStatus as any, updatedAt: new Date() })
          .where(eq(inventory.id, sourceInventory.id));

        // Record TRANSFER_OUT movement at source
        await tx.insert(stockMovements).values({
          locationId: transfer.fromLocationId,
          productId: item.productId,
          userId: dispatchUserId,
          movementType: "TRANSFER_OUT",
          quantity: item.quantityRequested,
          balanceBefore,
          balanceAfter: newBalance,
          transferId,
          notes: `Dispatched for transfer ${transfer.transferNumber}`,
        });

        // Update dispatched quantity on item
        await tx
          .update(inventoryTransferItems)
          .set({ quantityDispatched: item.quantityRequested })
          .where(eq(inventoryTransferItems.id, item.id));
      }

      // Mark transfer as IN_TRANSIT
      await tx
        .update(inventoryTransfers)
        .set({
          status: "IN_TRANSIT",
          dispatchedBy: dispatchUserId,
          dispatchedDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inventoryTransfers.id, transferId));

      await tx.insert(inventoryAuditLogs).values({
        userId: dispatchUserId,
        locationId: transfer.fromLocationId,
        action: "TRANSFER_DISPATCHED",
        entityType: "transfer",
        entityId: transferId,
        oldValues: { status: "APPROVED" },
        newValues: { status: "IN_TRANSIT" },
      });
    });

    return { success: true, data: undefined, message: "Transfer dispatched. Stock deducted from source branch." };
  } catch (err: any) {
    console.error("[DispatchTransfer Error]", err);
    return { success: false, error: err?.message ?? "Failed to dispatch transfer. Transaction rolled back." };
  }
}

// ============================================================
// RECEIVE TRANSFER (Blueprint 7.5 — receiveTransfer)
// Adds stock to destination. Only received quantity counts (BR-11).
// Records discrepancies (missing/damaged).
// ============================================================
export async function receiveTransfer(
  receivingUserId: string,
  transferId: string,
  receivedItems: ReceiveItemInput[]
): Promise<ServiceResult<{ discrepancies: number }>> {
  try {
    let totalDiscrepancies = 0;

    await db.transaction(async (tx) => {
      // Lock transfer row — idempotency check
      const [transfer] = await tx
        .select()
        .from(inventoryTransfers)
        .where(eq(inventoryTransfers.id, transferId))
        .for("update")
        .limit(1);

      if (!transfer) throw new Error("Transfer not found.");
      if (transfer.status !== "IN_TRANSIT") {
        throw new Error(`Cannot receive a transfer with status: ${transfer.status}`);
      }

      for (const received of receivedItems) {
        // Get the transfer item
        const [transferItem] = await tx
          .select()
          .from(inventoryTransferItems)
          .where(
            and(
              eq(inventoryTransferItems.id, received.transferItemId),
              eq(inventoryTransferItems.transferId, transferId)
            )
          )
          .for("update")
          .limit(1);

        if (!transferItem) continue;

        const dispatched = transferItem.quantityDispatched ?? 0;
        const qtyReceived = Math.max(0, Math.min(received.quantityReceived, dispatched));
        const discrepancy = dispatched - qtyReceived;
        totalDiscrepancies += discrepancy;

        // Update destination inventory (BR-11: only add received quantity)
        const [destInventory] = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.locationId, transfer.toLocationId),
              eq(inventory.productId, transferItem.productId)
            )
          )
          .for("update")
          .limit(1);

        const balanceBefore = destInventory?.quantity ?? 0;
        const newBalance = balanceBefore + qtyReceived;
        const reorderLevel = destInventory?.reorderLevel ?? 10;
        const stockStatus =
          newBalance === 0 ? "OUT_OF_STOCK" : newBalance <= reorderLevel ? "LOW_STOCK" : "NORMAL";

        if (destInventory) {
          await tx
            .update(inventory)
            .set({ quantity: newBalance, stockStatus: stockStatus as any, updatedAt: new Date() })
            .where(eq(inventory.id, destInventory.id));
        } else {
          await tx.insert(inventory).values({
            locationId: transfer.toLocationId,
            productId: transferItem.productId,
            quantity: newBalance,
            stockStatus: stockStatus as any,
            reorderLevel: 10,
            minStockLevel: 10,
            maxStockLevel: 100,
          });
        }

        // Record TRANSFER_IN movement at destination
        if (qtyReceived > 0) {
          await tx.insert(stockMovements).values({
            locationId: transfer.toLocationId,
            productId: transferItem.productId,
            userId: receivingUserId,
            movementType: "TRANSFER_IN",
            quantity: qtyReceived,
            balanceBefore,
            balanceAfter: newBalance,
            transferId,
            notes: `Received from transfer ${transfer.transferNumber}${
              discrepancy > 0 ? ` (${discrepancy} units missing/damaged)` : ""
            }`,
          });
        }

        // Update transfer item with received quantity and discrepancy
        await tx
          .update(inventoryTransferItems)
          .set({
            quantityReceived: qtyReceived,
            discrepancyQty: discrepancy,
            discrepancyReason: discrepancy > 0 ? (received.discrepancyReason ?? "Quantity shortfall in transit") : null,
          })
          .where(eq(inventoryTransferItems.id, received.transferItemId));
      }

      // Mark transfer as RECEIVED
      await tx
        .update(inventoryTransfers)
        .set({
          status: "RECEIVED",
          receivedBy: receivingUserId,
          receivedDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inventoryTransfers.id, transferId));

      await tx.insert(inventoryAuditLogs).values({
        userId: receivingUserId,
        locationId: transfer.toLocationId,
        action: "TRANSFER_RECEIVED",
        entityType: "transfer",
        entityId: transferId,
        oldValues: { status: "IN_TRANSIT" },
        newValues: { status: "RECEIVED", discrepancies: totalDiscrepancies },
      });
    });

    return {
      success: true,
      data: { discrepancies: totalDiscrepancies },
      message:
        totalDiscrepancies > 0
          ? `Transfer received with ${totalDiscrepancies} unit(s) discrepancy recorded.`
          : "Transfer received successfully. All quantities match.",
    };
  } catch (err: any) {
    console.error("[ReceiveTransfer Error]", err);
    return {
      success: false,
      error: err?.message ?? "Failed to receive transfer. Transaction rolled back.",
    };
  }
}

// ============================================================
// QUERIES
// ============================================================

export async function getTransferById(transferId: string) {
  const [transfer] = await db
    .select()
    .from(inventoryTransfers)
    .where(eq(inventoryTransfers.id, transferId))
    .limit(1);

  if (!transfer) return null;

  const items = await db
    .select({
      id: inventoryTransferItems.id,
      productId: inventoryTransferItems.productId,
      productName: products.name,
      productSku: products.sku,
      quantityRequested: inventoryTransferItems.quantityRequested,
      quantityDispatched: inventoryTransferItems.quantityDispatched,
      quantityReceived: inventoryTransferItems.quantityReceived,
      discrepancyQty: inventoryTransferItems.discrepancyQty,
      discrepancyReason: inventoryTransferItems.discrepancyReason,
    })
    .from(inventoryTransferItems)
    .leftJoin(products, eq(inventoryTransferItems.productId, products.id))
    .where(eq(inventoryTransferItems.transferId, transferId));

  return { ...transfer, items };
}

export async function getTransfers(filters?: {
  status?: string;
  locationId?: string;
}) {
  const conditions = [];
  if (filters?.status) {
    conditions.push(sql`${inventoryTransfers.status} = ${filters.status}`);
  }
  if (filters?.locationId) {
    conditions.push(
      sql`(${inventoryTransfers.fromLocationId} = ${filters.locationId} OR ${inventoryTransfers.toLocationId} = ${filters.locationId})`
    );
  }

  return db
    .select({
      id: inventoryTransfers.id,
      transferNumber: inventoryTransfers.transferNumber,
      status: inventoryTransfers.status,
      fromLocationId: inventoryTransfers.fromLocationId,
      fromLocationName: sql<string>`fl.name`,
      toLocationId: inventoryTransfers.toLocationId,
      toLocationName: sql<string>`tl.name`,
      requestedDate: inventoryTransfers.requestedDate,
      approvedDate: inventoryTransfers.approvedDate,
      dispatchedDate: inventoryTransfers.dispatchedDate,
      receivedDate: inventoryTransfers.receivedDate,
      notes: inventoryTransfers.notes,
    })
    .from(inventoryTransfers)
    .leftJoin(
      sql`locations fl`,
      sql`fl.id = ${inventoryTransfers.fromLocationId}`
    )
    .leftJoin(
      sql`locations tl`,
      sql`tl.id = ${inventoryTransfers.toLocationId}`
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${inventoryTransfers.requestedDate} DESC`);
}
