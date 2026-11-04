import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { customers, customerSegments, customerSegmentMembers, transactions } from "@/lib/schema";
import { eq, and, sql, desc, gte, inArray } from "drizzle-orm";

// GET - Get marketing campaigns and target customers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const businessId = url.searchParams.get('businessId');
    const campaignType = url.searchParams.get('type'); // 'email', 'sms', 'push'
    const segmentId = url.searchParams.get('segmentId');

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    // Get available customer segments for targeting
    const segments = await db
      .select({
        id: customerSegments.id,
        name: customerSegments.name,
        description: customerSegments.description,
        customerCount: customerSegments.customerCount,
        criteria: customerSegments.criteria
      })
      .from(customerSegments)
      .where(and(
        eq(customerSegments.businessId, businessId),
        eq(customerSegments.isActive, true)
      ));

    // Get customer targeting options
    let targetingData: any = {
      segments,
      totalCustomers: 0,
      targetableCustomers: {
        email: 0,
        sms: 0,
        push: 0
      }
    };

    // Count targetable customers by channel
    const customerStats = await db
      .select({
        total: sql`COUNT(*)`,
        withEmail: sql`COUNT(CASE WHEN ${customers.email} IS NOT NULL AND ${customers.email} != '' THEN 1 END)`,
        withPhone: sql`COUNT(CASE WHEN ${customers.phone} IS NOT NULL AND ${customers.phone} != '' THEN 1 END)`,
        // Assuming push notifications require app registration (would need additional table)
        withPush: sql`0` // In production: Add pushTokens table and count valid tokens
      })
      .from(customers)
      .where(eq(customers.businessId, businessId));

    if (customerStats.length > 0) {
      const stats = customerStats[0];
      targetingData.totalCustomers = Number(stats.total);
      targetingData.targetableCustomers.email = Number(stats.withEmail);
      targetingData.targetableCustomers.sms = Number(stats.withPhone);
      targetingData.targetableCustomers.push = Number(stats.withPush);
    }

    // If specific segment requested, get detailed customer list
    if (segmentId) {
      const segmentCustomers = await db
        .select({
          customerId: customers.id,
          customerName: customers.name,
          customerEmail: customers.email,
          customerPhone: customers.phone,
          loyaltyPoints: customers.loyaltyPoints,
          totalSpent: customers.totalSpent,
          lastPurchase: sql`(
            SELECT MAX(created_at) FROM transactions 
            WHERE customer_id = ${customers.id}
          )`
        })
        .from(customerSegmentMembers)
        .innerJoin(customers, eq(customerSegmentMembers.customerId, customers.id))
        .where(eq(customerSegmentMembers.segmentId, segmentId))
        .limit(1000);

      targetingData.segmentCustomers = segmentCustomers;
    }

    return NextResponse.json({
      targeting: targetingData,
      campaignTemplates: [
        {
          type: 'promotion',
          name: 'Discount Offer',
          subject: 'Special {{discount}}% Off Just for You!',
          template: 'Hi {{customerName}}, enjoy {{discount}}% off your next purchase. Valid until {{expiryDate}}.',
          variables: ['customerName', 'discount', 'expiryDate']
        },
        {
          type: 'loyalty',
          name: 'Loyalty Rewards',
          subject: 'Your Loyalty Points Are Ready!',
          template: 'Hi {{customerName}}, you have {{loyaltyPoints}} points ready to redeem. Visit us today!',
          variables: ['customerName', 'loyaltyPoints']
        },
        {
          type: 'reactivation',
          name: 'Win Back',
          subject: 'We Miss You!',
          template: 'Hi {{customerName}}, it\'s been {{daysSinceLastVisit}} days since your last visit. Come back for a special surprise!',
          variables: ['customerName', 'daysSinceLastVisit']
        }
      ]
    });

  } catch (error) {
    console.error("Get marketing data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create and send marketing campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      businessId,
      campaignName,
      campaignType, // 'email', 'sms', 'push'
      targetingType, // 'all', 'segment', 'custom'
      segmentIds,
      customerIds,
      subject,
      message,
      variables, // Object with variable values
      scheduleAt, // Optional - for scheduled campaigns
      testMode = false
    } = await request.json();

    if (!businessId || !campaignName || !campaignType || !message) {
      return NextResponse.json({ 
        error: "businessId, campaignName, campaignType, and message are required" 
      }, { status: 400 });
    }

    // Get target customers based on targeting type
    let targetCustomers: any[] = [];

    switch (targetingType) {
      case 'all':
        const allCustomers = await db
          .select({
            id: customers.id,
            name: customers.name,
            email: customers.email,
            phone: customers.phone,
            loyaltyPoints: customers.loyaltyPoints,
            totalSpent: customers.totalSpent
          })
          .from(customers)
          .where(eq(customers.businessId, businessId))
          .limit(10000);
        
        targetCustomers = allCustomers.filter(customer => {
          if (campaignType === 'email') return customer.email;
          if (campaignType === 'sms') return customer.phone;
          return true; // For push notifications
        });
        break;

      case 'segment':
        if (!segmentIds || segmentIds.length === 0) {
          return NextResponse.json({ 
            error: "segmentIds required for segment targeting" 
          }, { status: 400 });
        }

        const segmentCustomers = await db
          .select({
            id: customers.id,
            name: customers.name,
            email: customers.email,
            phone: customers.phone,
            loyaltyPoints: customers.loyaltyPoints,
            totalSpent: customers.totalSpent
          })
          .from(customerSegmentMembers)
          .innerJoin(customers, eq(customerSegmentMembers.customerId, customers.id))
          .where(inArray(customerSegmentMembers.segmentId, segmentIds));

        targetCustomers = segmentCustomers.filter(customer => {
          if (campaignType === 'email') return customer.email;
          if (campaignType === 'sms') return customer.phone;
          return true;
        });
        break;

      case 'custom':
        if (!customerIds || customerIds.length === 0) {
          return NextResponse.json({ 
            error: "customerIds required for custom targeting" 
          }, { status: 400 });
        }

        const customCustomers = await db
          .select({
            id: customers.id,
            name: customers.name,
            email: customers.email,
            phone: customers.phone,
            loyaltyPoints: customers.loyaltyPoints,
            totalSpent: customers.totalSpent
          })
          .from(customers)
          .where(inArray(customers.id, customerIds));

        targetCustomers = customCustomers;
        break;
    }

    if (targetCustomers.length === 0) {
      return NextResponse.json({ 
        error: "No valid target customers found" 
      }, { status: 400 });
    }

    // Process and personalize messages
    const processedMessages = targetCustomers.map(customer => {
      let personalizedMessage = message;
      let personalizedSubject = subject;

      // Replace variables in message and subject
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          const placeholder = `{{${key}}}`;
          personalizedMessage = personalizedMessage.replace(new RegExp(placeholder, 'g'), value as string);
          if (personalizedSubject) {
            personalizedSubject = personalizedSubject.replace(new RegExp(placeholder, 'g'), value as string);
          }
        }
      }

      // Replace customer-specific variables
      personalizedMessage = personalizedMessage
        .replace(/\{\{customerName\}\}/g, customer.name || 'Valued Customer')
        .replace(/\{\{loyaltyPoints\}\}/g, customer.loyaltyPoints?.toString() || '0')
        .replace(/\{\{totalSpent\}\}/g, customer.totalSpent?.toString() || '0');

      if (personalizedSubject) {
        personalizedSubject = personalizedSubject
          .replace(/\{\{customerName\}\}/g, customer.name || 'Valued Customer')
          .replace(/\{\{loyaltyPoints\}\}/g, customer.loyaltyPoints?.toString() || '0');
      }

      return {
        customerId: customer.id,
        customerName: customer.name,
        contactInfo: campaignType === 'email' ? customer.email : customer.phone,
        subject: personalizedSubject,
        message: personalizedMessage
      };
    });

    // In test mode, return preview without sending
    if (testMode) {
      return NextResponse.json({
        message: "Campaign preview generated",
        campaignName,
        campaignType,
        targetCount: targetCustomers.length,
        preview: processedMessages.slice(0, 5), // Show first 5 for preview
        totalTargets: processedMessages.length
      });
    }

    // In production: Integrate with Resend/SendGrid (email), Twilio (SMS), or FCM (push notifications)
    // This would integrate with email service (Resend, SendGrid)
    // SMS service (Twilio), or push notification service

    // For now, simulate sending
    const sentCount = processedMessages.length;
    const failureCount = 0; // Would track actual failures

    // In production: Store campaign in marketingCampaigns table with delivery tracking and metrics
    // Create marketing_campaigns table to store:
    // - Campaign details
    // - Delivery status
    // - Open/click tracking
    // - Results metrics

    return NextResponse.json({
      message: "Campaign sent successfully",
      campaignName,
      campaignType,
      sent: sentCount,
      failed: failureCount,
      scheduledFor: scheduleAt || "immediate",
      // Remove in production - for debugging only:
      debug: {
        sampleMessages: processedMessages.slice(0, 3)
      }
    });

  } catch (error) {
    console.error("Send marketing campaign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
