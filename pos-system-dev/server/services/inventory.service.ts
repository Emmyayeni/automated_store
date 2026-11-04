/**
 * Inventory Service — Business Logic Layer
 *
 * Implements the core inventory algorithms from the blueprint:
 * - Stock-In (Section 7.2)
 * - Stock-Out (Section 7.3)
 * - Low-Stock Detection (Section 7.4)
 * - Inventory Adjustment (Section 7.6)
 *
 * All multi-record operations use PostgreSQL transactions (Section 8).
 * Business Rules BR-04 through BR-15 are enforced here.
 */

import { db } from "@/lib/db";
import {
  inventory,
  stockMovements,
  inventoryAuditLogs,
  products,
  locations,
} from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

// ---- Types ----

export type StockInInput = {
  userId: string;
  locationId: string;
  productId: string;
  quantity: number;
  reference?: string;
  notes?: string;
};

export type StockOutInput = {
  userId: string;
  locationId: string;
  productId: string;
  quantity: number;
  reason: "SALE" | "DAMAGED" | "EXPIRED" | "INTERNAL_USE" | "ADJUSTMENT" | "OTHER";
  reference?: string;
  notes?: string;
};

export type AdjustmentInput = {
  userId: string;
  locationId: string;
  productId: string;
  newQuantity: number;
  reason: string;
  notes?: string;
};

export type ServiceResult<T = void> =
  | { success: true; data: T; message: string }
  | { success: false; error: string };

// ============================================================
// STOCK-IN (Blueprint Section 7.2)
// Increases branch inventory when goods are received.
// ============================================================
export async function recordStockIn(input: StockInInput): Promise<ServiceResult<{ newBalance: number }>> {
  const { userId, locationId, productId, quantity, reference, notes } = input;

  // --- Validation ---
  if (!userId || !locationId || !productId) {
    return { success: false, error: "Missing required fields." };
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { success: false, error: "Quantity must be a positive integer." };
  }

  // Check product exists and is active (BR-15)
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.isActive, true)))
    .limit(1);

  if (!product) {
    return { success: false, error: "Product not found or is inactive." };
  }

  // Check location exists and is active
  const [location] = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, locationId), eq(locations.status, "active")))
    .limit(1);

  if (!location) {
    return { success: false, error: "Branch not found or is inactive." };
  }

  try {
    let newBalance = 0;

    await db.transaction(async (tx) => {
      // Lock the inventory row for this product+branch (prevents race conditions — Section 8)
      const [existing] = await tx
        .select()
        .from(inventory)
        .where(and(eq(inventory.locationId, locationId), eq(inventory.productId, productId)))
        .for("update")
        .limit(1);

      const balanceBefore = existing?.quantity ?? 0;
      newBalance = balanceBefore + quantity;

      // Calculate stock status
      const reorderLevel = existing?.reorderLevel ?? existing?.minStockLevel ?? 10;
      const stockStatus =
        newBalance === 0 ? "OUT_OF_STOCK" : newBalance <= reorderLevel ? "LOW_STOCK" : "NORMAL";

      if (existing) {
        // Update existing inventory record
        await tx
          .update(inventory)
          .set({
            quantity: newBalance,
            stockStatus: stockStatus as any,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, existing.id));
      } else {
        // Create inventory record (first stock entry for this product at this branch)
        await tx.insert(inventory).values({
          locationId,
          productId,
          quantity: newBalance,
          stockStatus: stockStatus as any,
          reorderLevel: 10,
          minStockLevel: 10,
          maxStockLevel: 100,
        });
      }

      // Insert immutable stock movement record (BR-12, BR-13)
      await tx.insert(stockMovements).values({
        locationId,
        productId,
        userId,
        movementType: "STOCK_IN",
        quantity,
        balanceBefore,
        balanceAfter: newBalance,
        reference: reference ?? null,
        notes: notes ?? null,
      });

      // Insert audit log (BR-13)
      await tx.insert(inventoryAuditLogs).values({
        userId,
        locationId,
        action: "STOCK_IN",
        entityType: "inventory",
        entityId: productId,
        oldValues: { quantity: balanceBefore },
        newValues: { quantity: newBalance },
      });
    });

    return {
      success: true,
      data: { newBalance },
      message: `Stock updated. New balance: ${newBalance} units.`,
    };
  } catch (err) {
    console.error("[StockIn Error]", err);
    return { success: false, error: "Failed to record stock-in. The transaction was rolled back." };
  }
}

// ============================================================
// STOCK-OUT (Blueprint Section 7.3)
// Decreases branch inventory. Rejects if insufficient stock (BR-06).
// ============================================================
export async function recordStockOut(input: StockOutInput): Promise<ServiceResult<{ newBalance: number }>> {
  const { userId, locationId, productId, quantity, reason, reference, notes } = input;

  if (!userId || !locationId || !productId) {
    return { success: false, error: "Missing required fields." };
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { success: false, error: "Quantity must be a positive integer." };
  }

  // Check product is active (BR-15)
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.isActive, true)))
    .limit(1);

  if (!product) {
    return { success: false, error: "Product not found or is inactive." };
  }

  try {
    let newBalance = 0;

    await db.transaction(async (tx) => {
      // Lock the row to prevent concurrent deductions (Section 8)
      const [existing] = await tx
        .select()
        .from(inventory)
        .where(and(eq(inventory.locationId, locationId), eq(inventory.productId, productId)))
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const balanceBefore = existing.quantity;

      // BR-06: Never allow negative stock
      if (balanceBefore < quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      newBalance = balanceBefore - quantity;

      const reorderLevel = existing.reorderLevel ?? existing.minStockLevel ?? 10;
      const stockStatus =
        newBalance === 0 ? "OUT_OF_STOCK" : newBalance <= reorderLevel ? "LOW_STOCK" : "NORMAL";

      await tx
        .update(inventory)
        .set({
          quantity: newBalance,
          stockStatus: stockStatus as any,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, existing.id));

      await tx.insert(stockMovements).values({
        locationId,
        productId,
        userId,
        movementType: "STOCK_OUT",
        quantity,
        balanceBefore,
        balanceAfter: newBalance,
        reason: reason as any,
        reference: reference ?? null,
        notes: notes ?? null,
      });

      await tx.insert(inventoryAuditLogs).values({
        userId,
        locationId,
        action: "STOCK_OUT",
        entityType: "inventory",
        entityId: productId,
        oldValues: { quantity: balanceBefore },
        newValues: { quantity: newBalance },
      });
    });

    return {
      success: true,
      data: { newBalance },
      message: `Stock reduced. New balance: ${newBalance} units.`,
    };
  } catch (err: any) {
    if (err?.message === "INSUFFICIENT_STOCK") {
      return { success: false, error: "Insufficient stock. The operation was rejected." };
    }
    console.error("[StockOut Error]", err);
    return { success: false, error: "Failed to record stock-out. The transaction was rolled back." };
  }
}

// ============================================================
// LOW-STOCK DETECTION (Blueprint Section 7.4)
// Returns all LOW_STOCK and OUT_OF_STOCK items for a branch (or all).
// Formula: status = LOW_STOCK if quantity <= reorderLevel
// ============================================================
export async function getLowStockItems(locationId?: string) {
  // Update all statuses first (derived calculation)
  await refreshStockStatuses(locationId);

  const conditions = locationId
    ? and(
        eq(inventory.locationId, locationId),
        sql`${inventory.stockStatus} IN ('LOW_STOCK', 'OUT_OF_STOCK')`
      )
    : sql`${inventory.stockStatus} IN ('LOW_STOCK', 'OUT_OF_STOCK')`;

  const items = await db
    .select({
      id: inventory.id,
      locationId: inventory.locationId,
      productId: inventory.productId,
      quantity: inventory.quantity,
      reorderLevel: inventory.reorderLevel,
      stockStatus: inventory.stockStatus,
      productName: products.name,
      productSku: products.sku,
      locationName: locations.name,
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .leftJoin(locations, eq(inventory.locationId, locations.id))
    .where(conditions);

  return items;
}

// Refresh stock status for all inventory records (or for a specific branch)
export async function refreshStockStatuses(locationId?: string) {
  const condition = locationId ? eq(inventory.locationId, locationId) : undefined;

  // Set OUT_OF_STOCK where quantity = 0
  await db
    .update(inventory)
    .set({ stockStatus: "OUT_OF_STOCK" as any })
    .where(and(condition, eq(inventory.quantity, 0)));

  // Set LOW_STOCK where 0 < quantity <= reorderLevel
  await db
    .update(inventory)
    .set({ stockStatus: "LOW_STOCK" as any })
    .where(
      and(
        condition,
        sql`${inventory.quantity} > 0`,
        sql`${inventory.quantity} <= ${inventory.reorderLevel}`
      )
    );

  // Set NORMAL where quantity > reorderLevel
  await db
    .update(inventory)
    .set({ stockStatus: "NORMAL" as any })
    .where(
      and(
        condition,
        sql`${inventory.quantity} > ${inventory.reorderLevel}`
      )
    );
}

// ============================================================
// INVENTORY ADJUSTMENT (Blueprint Section 7.6)
// Authorized correction of physical vs system count.
// Records both old and new value — never silently overwrites.
// ============================================================
export async function adjustInventory(input: AdjustmentInput): Promise<ServiceResult<{ newBalance: number; difference: number }>> {
  const { userId, locationId, productId, newQuantity, reason, notes } = input;

  if (!Number.isInteger(newQuantity) || newQuantity < 0) {
    return { success: false, error: "New quantity must be a non-negative integer." };
  }

  try {
    let newBalance = 0;
    let difference = 0;

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(inventory)
        .where(and(eq(inventory.locationId, locationId), eq(inventory.productId, productId)))
        .for("update")
        .limit(1);

      const balanceBefore = existing?.quantity ?? 0;
      difference = newQuantity - balanceBefore;
      newBalance = newQuantity;

      const reorderLevel = existing?.reorderLevel ?? 10;
      const stockStatus =
        newBalance === 0 ? "OUT_OF_STOCK" : newBalance <= reorderLevel ? "LOW_STOCK" : "NORMAL";

      if (existing) {
        await tx
          .update(inventory)
          .set({ quantity: newBalance, stockStatus: stockStatus as any, updatedAt: new Date() })
          .where(eq(inventory.id, existing.id));
      } else {
        await tx.insert(inventory).values({
          locationId,
          productId,
          quantity: newBalance,
          stockStatus: stockStatus as any,
        });
      }

      await tx.insert(stockMovements).values({
        locationId,
        productId,
        userId,
        movementType: "ADJUSTMENT",
        quantity: Math.abs(difference),
        balanceBefore,
        balanceAfter: newBalance,
        notes: `Adjustment: ${reason}. ${notes ?? ""}`.trim(),
      });

      await tx.insert(inventoryAuditLogs).values({
        userId,
        locationId,
        action: "ADJUSTMENT",
        entityType: "inventory",
        entityId: productId,
        oldValues: { quantity: balanceBefore },
        newValues: { quantity: newBalance, reason },
      });
    });

    return {
      success: true,
      data: { newBalance, difference },
      message: `Inventory adjusted. New balance: ${newBalance} (${difference >= 0 ? "+" : ""}${difference}).`,
    };
  } catch (err) {
    console.error("[AdjustInventory Error]", err);
    return { success: false, error: "Adjustment failed. Transaction rolled back." };
  }
}

// ============================================================
// INVENTORY QUERIES — Dashboard stats
// ============================================================

export async function getInventorySummary(locationId?: string) {
  await refreshStockStatuses(locationId);

  const condition = locationId ? eq(inventory.locationId, locationId) : undefined;

  const [result] = await db
    .select({
      totalProducts: sql<number>`COUNT(*)`,
      totalUnits: sql<number>`COALESCE(SUM(${inventory.quantity}), 0)`,
      lowStockCount: sql<number>`COUNT(*) FILTER (WHERE ${inventory.stockStatus} = 'LOW_STOCK')`,
      outOfStockCount: sql<number>`COUNT(*) FILTER (WHERE ${inventory.stockStatus} = 'OUT_OF_STOCK')`,
    })
    .from(inventory)
    .where(condition);

  return result;
}

export async function getBranchInventory(locationId: string) {
  return db
    .select({
      id: inventory.id,
      productId: inventory.productId,
      productName: products.name,
      productSku: products.sku,
      quantity: inventory.quantity,
      reorderLevel: inventory.reorderLevel,
      stockStatus: inventory.stockStatus,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .where(eq(inventory.locationId, locationId))
    .orderBy(products.name);
}

export async function getAllBranchesInventory() {
  return db
    .select({
      id: inventory.id,
      locationId: inventory.locationId,
      locationName: locations.name,
      productId: inventory.productId,
      productName: products.name,
      productSku: products.sku,
      quantity: inventory.quantity,
      reorderLevel: inventory.reorderLevel,
      stockStatus: inventory.stockStatus,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .leftJoin(locations, eq(inventory.locationId, locations.id))
    .orderBy(locations.name, products.name);
}
