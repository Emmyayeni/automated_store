import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { staffInvites } from "@/lib/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_key");

export async function POST(req: NextRequest) {
  const { email, role, businessId, locationId } = await req.json();

  if (!email || !role || !businessId || !locationId) {
    return NextResponse.json(
      { error: "Email, role, businessId, and locationId are required" },
      { status: 400 }
    );
  }

  // Check for existing invite
  const existing = await db
    .select()
    .from(staffInvites)
    .where(eq(staffInvites.email, email));

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "User already invited" },
      { status: 400 }
    );
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const [invite] = await db
    .insert(staffInvites)
    .values({
      email,
      role,
      businessId,
      locationId,
      token,
      expiresAt,
    })
    .returning();

  const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/accept-invite?token=${token}`;
  console.log("Invite link:", inviteLink);

  // try {
  //   const data = await resend.emails.send({
  //     from: "POS System <onboarding@yourdomain.com>", // ✅ make sure this is verified in Resend
  //     to: email,
  //     subject: "You're invited to join the POS System",
  //     html: `
  //       <div style="font-family: sans-serif; line-height: 1.6;">
  //         <p>Hello ${email},</p>
  //         <p>You’ve been invited to join our POS System as a <strong>${role}</strong>.</p>
  //         <p>Click the link below to accept your invite:</p>
  //         <p><a href="${inviteLink}" target="_blank" style="color:blue;">Accept Invite</a></p>
  //         <p>This link will expire in 7 days.</p>
  //       </div>
  //     `,
  //   });

  //   if (data.error) {
  //     console.error("Resend error:", data.error);
  //     return NextResponse.json({ error: data.error.message }, { status: 400 });
  //   }

  //   console.log("Email sent successfully:", data);
  // } catch (error) {
  //   console.error("Email sending failed:", error);
  //   return NextResponse.json({ error: "Failed to send invite email" }, { status: 500 });
  // }

  return NextResponse.json({ success: true, inviteLink });
}
