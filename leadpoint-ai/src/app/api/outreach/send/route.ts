/**
 * Send Outreach Email API
 * POST /api/outreach/send
 * 
 * Sends an email to an influencer via Resend and tracks the message
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, wrapEmailHtml, isResendAvailable } from "@/lib/resend";
import type { ApiResponse } from "@/types/api";
import type { OutreachMessage } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

interface SendEmailRequest {
  /** Campaign influencer ID to send email to */
  campaign_influencer_id: string;
  /** Email subject line */
  subject: string;
  /** Email body content */
  body: string;
  /** Optional reply-to email address */
  reply_to?: string;
  /** Optional existing message ID to update (if resending a draft) */
  message_id?: string;
}

interface SendEmailResponse {
  message: OutreachMessage;
  email_message_id: string;
  is_mock: boolean;
}

// ============================================================================
// POST - Send email to influencer
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to send emails",
            status: 401,
          },
        },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NO_ORGANIZATION",
            message: "You must be part of an organization",
            status: 403,
          },
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body: SendEmailRequest = await request.json();
    const {
      campaign_influencer_id,
      subject,
      body: emailBody,
      reply_to,
      message_id,
    } = body;

    // Validate required fields
    if (!campaign_influencer_id || !subject || !emailBody) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "campaign_influencer_id, subject, and body are required",
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    // Get campaign influencer with influencer and campaign details
    const { data: campaignInfluencer, error: ciError } = await supabase
      .from("campaign_influencers")
      .select(`
        id,
        campaign_id,
        influencer_id,
        stage,
        influencers!inner (
          id,
          email,
          contact_info,
          display_name,
          username
        ),
        campaigns!inner (
          id,
          name,
          organization_id
        )
      `)
      .eq("id", campaign_influencer_id)
      .single();

    if (ciError || !campaignInfluencer) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Campaign influencer not found",
            status: 404,
          },
        },
        { status: 404 }
      );
    }

    // Type assertion for nested data
    const influencer = campaignInfluencer.influencers as unknown as {
      id: string;
      email: string | null;
      contact_info: { email?: string } | null;
      display_name: string;
      username: string;
    };
    
    const campaign = campaignInfluencer.campaigns as unknown as {
      id: string;
      name: string;
      organization_id: string;
    };

    // Verify campaign belongs to user's organization
    if (campaign.organization_id !== membership.organization_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "You don't have access to this campaign",
            status: 403,
          },
        },
        { status: 403 }
      );
    }

    // Get influencer's contact email
    const contactEmail = influencer.email || influencer.contact_info?.email;

    if (!contactEmail) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NO_EMAIL",
            message: "Influencer does not have a contact email address",
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    // Wrap the email body in HTML template
    const htmlContent = wrapEmailHtml(emailBody, campaign_influencer_id);

    // Send the email via Resend
    const emailResult = await sendEmail({
      to: contactEmail,
      subject,
      html: htmlContent,
      replyTo: reply_to,
      tags: [
        { name: "campaign_id", value: campaign.id },
        { name: "campaign_influencer_id", value: campaign_influencer_id },
        { name: "influencer_id", value: influencer.id },
      ],
    });

    const now = new Date().toISOString();

    // Create or update outreach message record
    let outreachMessage: OutreachMessage;

    if (message_id) {
      // Update existing message
      const { data: updatedMessage, error: updateError } = await supabase
        .from("outreach_messages")
        .update({
          subject,
          body: emailBody,
          status: "sent",
          sent_at: now,
          email_message_id: emailResult.messageId,
          email_status: emailResult.isMock ? "sent" : "queued",
          updated_at: now,
        })
        .eq("id", message_id)
        .eq("campaign_influencer_id", campaign_influencer_id)
        .select()
        .single();

      if (updateError || !updatedMessage) {
        console.error("Error updating outreach message:", updateError);
        return NextResponse.json<ApiResponse<null>>(
          {
            data: null,
            error: {
              code: "DATABASE_ERROR",
              message: "Failed to update outreach message record",
              status: 500,
            },
          },
          { status: 500 }
        );
      }

      outreachMessage = updatedMessage;
    } else {
      // Create new message record
      const { data: newMessage, error: insertError } = await supabase
        .from("outreach_messages")
        .insert({
          campaign_influencer_id,
          message_type: "initial",
          subject,
          body: emailBody,
          ai_generated: false,
          status: "sent",
          sent_at: now,
          email_message_id: emailResult.messageId,
          email_status: emailResult.isMock ? "sent" : "queued",
          opened_count: 0,
          clicked_count: 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError || !newMessage) {
        console.error("Error creating outreach message:", insertError);
        return NextResponse.json<ApiResponse<null>>(
          {
            data: null,
            error: {
              code: "DATABASE_ERROR",
              message: "Failed to create outreach message record",
              status: 500,
            },
          },
          { status: 500 }
        );
      }

      outreachMessage = newMessage;
    }

    // Update pipeline stage to 'contacted' if currently in early stages
    const earlyStages = ["discovered", "researching", "outreach_pending"];
    if (earlyStages.includes(campaignInfluencer.stage)) {
      await supabase
        .from("campaign_influencers")
        .update({
          stage: "contacted",
          stage_changed_at: now,
        })
        .eq("id", campaign_influencer_id);
    }

    // Return success response
    return NextResponse.json<ApiResponse<SendEmailResponse>>(
      {
        data: {
          message: outreachMessage,
          email_message_id: emailResult.messageId,
          is_mock: emailResult.isMock || false,
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/outreach/send:", error);
    
    // Check if it's a Resend error
    if (error instanceof Error && error.message.startsWith("Failed to send email")) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "EMAIL_SEND_ERROR",
            message: error.message,
            status: 502,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          status: 500,
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Check Resend availability
// ============================================================================

export async function GET() {
  return NextResponse.json({
    available: isResendAvailable(),
    from_email: process.env.RESEND_FROM_EMAIL || "not configured",
  });
}
