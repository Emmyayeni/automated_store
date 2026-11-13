import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, inventoryAuditLogs, users, locations, stockMovements, products } from "@/lib/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    // Fetch primary audit logs joined with users and locations
    const generalLogs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        tableName: auditLogs.tableName,
        recordId: auditLogs.recordId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        locationName: locations.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(locations, eq(auditLogs.locationId, locations.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    // Also fetch inventory audit logs for complete visibility
    const invLogs = await db
      .select({
        id: inventoryAuditLogs.id,
        action: inventoryAuditLogs.action,
        entityType: inventoryAuditLogs.entityType,
        entityId: inventoryAuditLogs.entityId,
        details: inventoryAuditLogs.newValues,
        ipAddress: inventoryAuditLogs.ipAddress,
        createdAt: inventoryAuditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        locationName: locations.name,
      })
      .from(inventoryAuditLogs)
      .leftJoin(users, eq(inventoryAuditLogs.userId, users.id))
      .leftJoin(locations, eq(inventoryAuditLogs.locationId, locations.id))
      .orderBy(desc(inventoryAuditLogs.createdAt))
      .limit(limit);

    // Map combined list
    const combined = [
      ...generalLogs.map((g) => ({
        id: g.id,
        type: "SYSTEM",
        action: g.action.toUpperCase(),
        entity: g.tableName || "System",
        recordId: g.recordId,
        userName: g.userName || g.userEmail || "System Administrator",
        userEmail: g.userEmail,
        locationName: g.locationName || "Central Supermarket Hub",
        details: g.newValues || g.oldValues || null,
        ipAddress: g.ipAddress || "127.0.0.1",
        createdAt: g.createdAt,
      })),
      ...invLogs.map((i) => ({
        id: i.id,
        type: "INVENTORY",
        action: i.action.toUpperCase(),
        entity: i.entityType || "Inventory",
        recordId: i.entityId,
        userName: i.userName || i.userEmail || "System",
        userEmail: i.userEmail,
        locationName: i.locationName || "Central Warehouse",
        details: i.details,
        ipAddress: i.ipAddress || "Internal",
        createdAt: i.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return NextResponse.json(combined.slice(0, limit));
  } catch (error: any) {
    console.error("Error in GET /api/audit-logs:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
