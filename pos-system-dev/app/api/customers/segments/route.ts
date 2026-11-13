import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { customerSegments, customerSegmentMembers, customers, transactions } from "@/lib/schema";
import { eq, and, sql, desc, gte, count, avg, sum } from "drizzle-orm";

// GET - Get customer segments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const businessId = url.searchParams.get('businessId');
    const includeMembers = url.searchParams.get('includeMembers') === 'true';

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    let segmentsQuery = db
      .select({
        id: customerSegments.id,
        name: customerSegments.name,
        description: customerSegments.description,
        criteria: customerSegments.criteria,
        isActive: customerSegments.isActive,
        autoUpdate: customerSegments.autoUpdate,
        lastUpdated: customerSegments.lastUpdated,
        customerCount: customerSegments.customerCount,
        createdAt: customerSegments.createdAt,
      })
      .from(customerSegments)
      .where(eq(customerSegments.businessId, businessId))
      .orderBy(desc(customerSegments.createdAt));

    const segments = await segmentsQuery;

    if (includeMembers) {
      // Add member details for each segment
      for (const segment of segments) {
        const members = await db
          .select({
            customerId: customers.id,
            customerName: customers.name,
            customerEmail: customers.email,
            loyaltyPoints: customers.loyaltyPoints,
            totalSpent: customers.totalSpent,
            addedAt: customerSegmentMembers.addedAt,
            addedBy: customerSegmentMembers.addedBy,
          })
          .from(customerSegmentMembers)
          .innerJoin(customers, eq(customerSegmentMembers.customerId, customers.id))
          .where(eq(customerSegmentMembers.segmentId, segment.id))
          .limit(100);

        (segment as any).members = members;
      }
    }

    return NextResponse.json({
      segments,
      count: segments.length
    });

  } catch (error) {
    console.error("Get customer segments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create customer segment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      businessId,
      name,
      description,
      criteria,
      autoUpdate = true
    } = await request.json();

    if (!businessId || !name || !criteria) {
      return NextResponse.json({ 
        error: "businessId, name, and criteria are required" 
      }, { status: 400 });
    }

    // Validate criteria structure
    const validCriteriaTypes = [
      'total_spent', 'loyalty_points', 'purchase_frequency', 
      'last_purchase_days', 'product_category', 'location'
    ];

    if (!criteria.rules || !Array.isArray(criteria.rules)) {
      return NextResponse.json({ 
        error: "Criteria must have a rules array" 
      }, { status: 400 });
    }

    for (const rule of criteria.rules) {
      if (!validCriteriaTypes.includes(rule.type)) {
        return NextResponse.json({ 
          error: `Invalid criteria type: ${rule.type}` 
        }, { status: 400 });
      }
    }

    // Create segment
    const [segment] = await db
      .insert(customerSegments)
      .values({
        businessId,
        name,
        description,
        criteria: JSON.stringify(criteria),
        isActive: true,
        autoUpdate,
        lastUpdated: new Date(),
        customerCount: 0
      })
      .returning();

    // If auto-update is enabled, populate segment immediately
    if (autoUpdate) {
      await updateSegmentMembers(segment.id, criteria);
    }

    return NextResponse.json({
      message: "Customer segment created successfully",
      segment
    });

  } catch (error) {
    console.error("Create customer segment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update segment and refresh members
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      segmentId,
      name,
      description,
      criteria,
      isActive,
      autoUpdate,
      refreshMembers = false
    } = await request.json();

    if (!segmentId) {
      return NextResponse.json({ error: "segmentId is required" }, { status: 400 });
    }

    const updates: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;
    if (autoUpdate !== undefined) updates.autoUpdate = autoUpdate;
    
    if (criteria !== undefined) {
      updates.criteria = JSON.stringify(criteria);
      updates.lastUpdated = new Date();
    }

    const [updatedSegment] = await db
      .update(customerSegments)
      .set(updates)
      .where(eq(customerSegments.id, segmentId))
      .returning();

    // Refresh segment members if requested or criteria changed
    if (refreshMembers || criteria !== undefined) {
      const criteriaObj = criteria || JSON.parse(updatedSegment.criteria as string);
      await updateSegmentMembers(segmentId, criteriaObj);
    }

    return NextResponse.json({
      message: "Customer segment updated successfully",
      segment: updatedSegment
    });

  } catch (error) {
    console.error("Update customer segment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to update segment members based on criteria
async function updateSegmentMembers(segmentId: string, criteria: any) {
  try {
    // Clear existing members
    await db
      .delete(customerSegmentMembers)
      .where(eq(customerSegmentMembers.segmentId, segmentId));

    // Build dynamic query based on criteria
    let conditions: any[] = [];
    
    for (const rule of criteria.rules) {
      switch (rule.type) {
        case 'total_spent':
          if (rule.operator === 'gt') {
            conditions.push(sql`${customers.totalSpent} > ${rule.value}`);
          } else if (rule.operator === 'lt') {
            conditions.push(sql`${customers.totalSpent} < ${rule.value}`);
          } else if (rule.operator === 'between') {
            conditions.push(sql`${customers.totalSpent} BETWEEN ${rule.min} AND ${rule.max}`);
          }
          break;
          
        case 'loyalty_points':
          if (rule.operator === 'gt') {
            conditions.push(sql`${customers.loyaltyPoints} > ${rule.value}`);
          } else if (rule.operator === 'lt') {
            conditions.push(sql`${customers.loyaltyPoints} < ${rule.value}`);
          }
          break;
          
        case 'last_purchase_days':
          const daysAgo = new Date(Date.now() - rule.value * 24 * 60 * 60 * 1000);
          conditions.push(sql`EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.customer_id = ${customers.id} 
            AND t.created_at >= ${daysAgo}
          )`);
          break;
      }
    }

    // Get customers matching criteria
    const matchingCustomers = await db
      .select({ id: customers.id })
      .from(customers)
      .where(conditions.length > 0 ? (criteria.operator === 'AND' ? and(...conditions) : conditions[0]) : undefined)
      .limit(10000);

    // Add customers to segment
    if (matchingCustomers.length > 0) {
      const memberInserts = matchingCustomers.map(customer => ({
        segmentId,
        customerId: customer.id,
        addedAt: new Date(),
        addedBy: 'auto'
      }));

      await db.insert(customerSegmentMembers).values(memberInserts);
    }

    // Update segment customer count
    await db
      .update(customerSegments)
      .set({
        customerCount: matchingCustomers.length,
        lastUpdated: new Date()
      })
      .where(eq(customerSegments.id, segmentId));

    return matchingCustomers.length;

  } catch (error) {
    console.error("Update segment members error:", error);
    throw error;
  }
}
