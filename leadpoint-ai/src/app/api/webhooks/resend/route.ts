/**
 * Resend Webhook Handler
 * POST /api/webhooks/resend
 * 
 * Handles email events from Resend:
 * - email.sent
 * - email.delivered
 * - email.opened
 * - email.clicked
 * - email.bounced
 * - email.complained
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type { EmailStatus } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Click event specific
    click?: {
      ipAddress: string;
      link: string;
      timestamp: string;
      userAgent: string;
    };
    // Bounce event specific
    bounce?: {
      message: string;
    };
    // Open event specific
    open?: {
      ipAddress: string;
      timestamp: string;
      userAgent: string;
    };
  };
}

// Map Resend event types to our EmailStatus
const EVENT_TO_STATUS: Record<string, EmailStatus> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "sent", // Keep as sent, delivery is just delayed
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "bounced", // Treat complaints as bounces
};

// ============================================================================
// Webhook Signature Verification
// ============================================================================

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.warn("[Resend Webhook] No signature or secret provided");
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Resend sends signature as "sha256=<hash>"
    const providedSignature = signature.replace("sha256=", "");
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    );
  } catch (error) {
    console.error("[Resend Webhook] Signature verification error:", error);
    return false;
  }
}

// ============================================================================
// POST - Handle Resend webhook events
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    const signature = request.headers.get("resend-signature");

    if (webhookSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      
      if (!isValid) {
        console.error("[Resend Webhook] Invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      console.warn("[Resend Webhook] No webhook secret configured, skipping verification");
    }

    // Parse the event
    const event: ResendWebhookEvent = JSON.parse(rawBody);
    
    console.log("[Resend Webhook] Received event:", event.type, event.data.email_id);

    // Get the email status from event type
    const emailStatus = EVENT_TO_STATUS[event.type];
    
    if (!emailStatus) {
      console.log("[Resend Webhook] Unhandled event type:", event.type);
      return NextResponse.json({ received: true, handled: false });
    }

    // Create Supabase client with service role for webhook processing
    // We need service role because webhooks don't have user auth context
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Resend Webhook] Missing Supabase credentials");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the outreach message by email_message_id
    const { data: message, error: findError } = await supabase
      .from("outreach_messages")
      .select("id, email_status, opened_count, clicked_count")
      .eq("email_message_id", event.data.email_id)
      .single();

    if (findError || !message) {
      console.log("[Resend Webhook] Message not found for email_id:", event.data.email_id);
      // Return success anyway - might be from a different system or test email
      return NextResponse.json({ received: true, found: false });
    }

    // Prepare update data based on event type
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      email_status: emailStatus,
      updated_at: now,
    };

    // Handle specific event types
    switch (event.type) {
      case "email.sent":
        // Just update status, no additional data
        break;

      case "email.delivered":
        // Email was successfully delivered to recipient's mail server
        break;

      case "email.opened":
        updateData.opened_count = (message.opened_count || 0) + 1;
        updateData.last_opened_at = event.data.open?.timestamp || now;
        // Also update the legacy opened_at if this is the first open
        if (!message.opened_count || message.opened_count === 0) {
          updateData.opened_at = event.data.open?.timestamp || now;
          updateData.status = "opened"; // Update legacy status too
        }
        break;

      case "email.clicked":
        updateData.clicked_count = (message.clicked_count || 0) + 1;
        updateData.last_clicked_at = event.data.click?.timestamp || now;
        break;

      case "email.bounced":
        updateData.bounce_reason = event.data.bounce?.message || "Email bounced";
        updateData.status = "bounced"; // Update legacy status too
        break;

      case "email.complained":
        updateData.bounce_reason = "Recipient marked as spam";
        updateData.status = "bounced"; // Update legacy status too
        break;
    }

    // Update the outreach message
    const { error: updateError } = await supabase
      .from("outreach_messages")
      .update(updateData)
      .eq("id", message.id);

    if (updateError) {
      console.error("[Resend Webhook] Error updating message:", updateError);
      return NextResponse.json(
        { error: "Failed to update message" },
        { status: 500 }
      );
    }

    console.log("[Resend Webhook] Successfully processed:", event.type, message.id);

    return NextResponse.json({
      received: true,
      handled: true,
      message_id: message.id,
      status: emailStatus,
    });
  } catch (error) {
    console.error("[Resend Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Health check for webhook endpoint
// ============================================================================

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/resend",
    configured: !!process.env.RESEND_WEBHOOK_SECRET,
  });
}
