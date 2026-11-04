import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { customerFeedback, customers, locations, transactions, users } from "@/lib/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

// GET - Get customer feedback
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const locationId = url.searchParams.get('locationId');
    const feedbackType = url.searchParams.get('type');
    const rating = url.searchParams.get('rating');
    const isResolved = url.searchParams.get('resolved');
    const days = Number.parseInt(url.searchParams.get('days') || '30');

    let conditions = [];

    if (locationId) {
      conditions.push(eq(customerFeedback.locationId, locationId));
    }

    if (feedbackType) {
      conditions.push(eq(customerFeedback.feedbackType, feedbackType as any));
    }

    if (rating) {
      conditions.push(eq(customerFeedback.rating, rating as any));
    }

    if (isResolved !== null) {
      conditions.push(eq(customerFeedback.isResolved, isResolved === 'true'));
    }

    // Filter by date range
    if (days > 0) {
      const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      conditions.push(gte(customerFeedback.createdAt, dateThreshold));
    }

    const feedback = await db
      .select({
        id: customerFeedback.id,
        feedbackType: customerFeedback.feedbackType,
        rating: customerFeedback.rating,
        subject: customerFeedback.subject,
        message: customerFeedback.message,
        isAnonymous: customerFeedback.isAnonymous,
        isResolved: customerFeedback.isResolved,
        response: customerFeedback.response,
        createdAt: customerFeedback.createdAt,
        resolvedAt: customerFeedback.resolvedAt,
        // Customer info (if not anonymous)
        customerName: customers.name,
        customerEmail: customers.email,
        // Location info
        locationName: locations.name,
        // Transaction info
        transactionNumber: transactions.transactionNumber,
        // Resolver info
        resolverName: users.name,
      })
      .from(customerFeedback)
      .leftJoin(customers, eq(customerFeedback.customerId, customers.id))
      .leftJoin(locations, eq(customerFeedback.locationId, locations.id))
      .leftJoin(transactions, eq(customerFeedback.transactionId, transactions.id))
      .leftJoin(users, eq(customerFeedback.resolvedBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(customerFeedback.createdAt))
      .limit(100);

    // Get summary statistics
    const stats = await db
      .select({
        totalFeedback: sql`COUNT(*)`,
        averageRating: sql`AVG(CASE WHEN ${customerFeedback.rating} IS NOT NULL THEN CAST(${customerFeedback.rating} AS INTEGER) END)`,
        unresolved: sql`SUM(CASE WHEN ${customerFeedback.isResolved} = false THEN 1 ELSE 0 END)`,
        resolved: sql`SUM(CASE WHEN ${customerFeedback.isResolved} = true THEN 1 ELSE 0 END)`,
        byType: sql`json_object_agg(${customerFeedback.feedbackType}, COUNT(*))`,
        byRating: sql`json_object_agg(${customerFeedback.rating}, COUNT(*))`,
      })
      .from(customerFeedback)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      feedback,
      stats: stats[0],
      filters: {
        locationId,
        feedbackType,
        rating,
        isResolved,
        days
      }
    });

  } catch (error) {
    console.error("Get customer feedback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Submit customer feedback
export async function POST(request: NextRequest) {
  try {
    const {
      customerId,
      locationId,
      transactionId,
      feedbackType,
      rating,
      subject,
      message,
      isAnonymous = false
    } = await request.json();

    if (!locationId || !feedbackType || !message) {
      return NextResponse.json({ 
        error: "locationId, feedbackType, and message are required" 
      }, { status: 400 });
    }

    // Validate feedback type
    const validTypes = ['product', 'service', 'location', 'staff', 'general'];
    if (!validTypes.includes(feedbackType)) {
      return NextResponse.json({ 
        error: `Invalid feedback type. Must be one of: ${validTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Validate rating if provided
    if (rating && !['1', '2', '3', '4', '5'].includes(rating.toString())) {
      return NextResponse.json({ 
        error: "Rating must be between 1 and 5" 
      }, { status: 400 });
    }

    const [feedback] = await db
      .insert(customerFeedback)
      .values({
        customerId: isAnonymous ? null : customerId,
        locationId,
        transactionId,
        feedbackType: feedbackType as any,
        rating: rating ? rating.toString() as any : null,
        subject,
        message,
        isAnonymous,
        isResolved: false
      })
      .returning();

    // In production: Send notifications to location managers via email/SMS integration
    // In production: Trigger immediate alerts for ratings below 3 via notification system

    return NextResponse.json({
      message: "Feedback submitted successfully",
      feedback: {
        id: feedback.id,
        type: feedback.feedbackType,
        rating: feedback.rating,
        isAnonymous: feedback.isAnonymous,
        createdAt: feedback.createdAt
      }
    });

  } catch (error) {
    console.error("Submit feedback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Respond to feedback
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      feedbackId,
      response,
      isResolved = false
    } = await request.json();

    if (!feedbackId) {
      return NextResponse.json({ error: "feedbackId is required" }, { status: 400 });
    }

    // Get current user
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: any = {
      updatedAt: new Date()
    };

    if (response !== undefined) {
      updates.response = response;
    }

    if (isResolved) {
      updates.isResolved = true;
      updates.resolvedBy = user.id;
      updates.resolvedAt = new Date();
    }

    const [updatedFeedback] = await db
      .update(customerFeedback)
      .set(updates)
      .where(eq(customerFeedback.id, feedbackId))
      .returning();

    if (!updatedFeedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // In production: Send thank you notification to customer via email/SMS if contact provided

    return NextResponse.json({
      message: "Feedback updated successfully",
      feedback: updatedFeedback
    });

  } catch (error) {
    console.error("Respond to feedback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
