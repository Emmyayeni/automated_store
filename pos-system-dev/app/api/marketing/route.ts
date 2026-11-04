import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { campaigns } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@/lib/auth"

// GET: List all campaigns for the current business
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const businessId = session.user.businessId

    const result = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.businessId, businessId))
      .orderBy(campaigns.createdAt)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
  }
}

// POST: Create a new campaign for the current business
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const businessId = session.user.businessId
    const body = await request.json()

    if (!body.name || !body.subject || !body.segment) {
      return NextResponse.json(
        { error: "Missing required fields: name, subject, segment" },
        { status: 400 }
      )
    }

    const [campaign] = await db
      .insert(campaigns)
      .values({
        businessId,
        name: body.name,
        subject: body.subject,
        content: body.content ?? "",
        segment: body.segment,
        status: body.scheduledDate ? "scheduled" : "draft",
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        recipients: body.recipients ?? 0,
        openRate: 0,
        clickRate: 0,
      })
      .returning()

    return NextResponse.json(campaign)
  } catch (error) {
    console.error("Error creating campaign:", error)
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
  }
}

// PUT: Update a campaign (status, content, etc.)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const businessId = session.user.businessId
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: "Missing campaign id" }, { status: 400 })
    }

    const [updated] = await db
      .update(campaigns)
      .set({
        name: body.name,
        subject: body.subject,
        content: body.content,
        segment: body.segment,
        status: body.status,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        recipients: body.recipients,
        openRate: body.openRate,
        clickRate: body.clickRate,
      })
      .where(and(eq(campaigns.id, body.id), eq(campaigns.businessId, businessId)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating campaign:", error)
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
  }
}

// DELETE: Remove a campaign
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const businessId = session.user.businessId
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Missing campaign id" }, { status: 400 })
    }

    const [deleted] = await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.businessId, businessId)))
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting campaign:", error)
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
  }
}