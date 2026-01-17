import { NextRequest, NextResponse } from "next/server";
import { createClient, isDevMode } from "@/lib/supabase/server";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { OutreachMessage } from "@/types/database";
import type { SaveOutreachRequest } from "@/types/outreach";

// Mock outreach messages for dev mode
const mockOutreachMessages: OutreachMessage[] = [
  {
    id: 'msg-1',
    campaign_influencer_id: 'ci-1',
    message_type: 'initial',
    subject: 'Partnership Opportunity with Summer Product Launch',
    body: 'Hi Jane! We love your fitness content and would love to partner with you on our Summer Product Launch campaign...',
    status: 'sent',
    channel: 'email',
    sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    opened_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    clicked_at: null,
    replied_at: null,
    created_by: 'mock-user',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-2',
    campaign_influencer_id: 'ci-2',
    message_type: 'follow_up',
    subject: 'Quick follow-up on partnership',
    body: 'Hi Mike, just wanted to follow up on my previous email about the partnership opportunity...',
    status: 'draft',
    channel: 'email',
    sent_at: null,
    opened_at: null,
    clicked_at: null,
    replied_at: null,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================================================
// GET - List outreach messages for a campaign
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const influencerId = searchParams.get("influencer_id");
    const campaignInfluencerId = searchParams.get("campaign_influencer_id");
    const status = searchParams.get("status");
    const messageType = searchParams.get("message_type");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("page_size") || "20", 10);

    // Dev mode - return mock data
    if (isDevMode()) {
      let filtered = [...mockOutreachMessages];
      if (status) filtered = filtered.filter(m => m.status === status);
      if (messageType) filtered = filtered.filter(m => m.message_type === messageType);

      return NextResponse.json<PaginatedResponse<OutreachMessage>>({
        data: filtered,
        pagination: {
          page,
          pageSize,
          total: filtered.length,
          totalPages: 1,
          hasMore: false,
        },
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not available', status: 503 } },
        { status: 503 }
      );
    }

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
            message: "You must be logged in to view outreach messages",
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

    // Verify campaign exists and belongs to organization
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("organization_id", membership.organization_id)
      .single();

    if (!campaign) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Campaign not found",
            status: 404,
          },
        },
        { status: 404 }
      );
    }

    // Get campaign influencer IDs for this campaign
    const { data: campaignInfluencers } = await supabase
      .from("campaign_influencers")
      .select("id, influencer_id")
      .eq("campaign_id", campaignId);

    if (!campaignInfluencers || campaignInfluencers.length === 0) {
      return NextResponse.json<PaginatedResponse<OutreachMessage>>({
        data: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    // Build the query
    let query = supabase
      .from("outreach_messages")
      .select("*", { count: "exact" })
      .in(
        "campaign_influencer_id",
        campaignInfluencers.map((ci) => ci.id)
      );

    // Apply filters
    if (campaignInfluencerId) {
      query = query.eq("campaign_influencer_id", campaignInfluencerId);
    }

    if (influencerId) {
      const matchingCIs = campaignInfluencers.filter(
        (ci) => ci.influencer_id === influencerId
      );
      if (matchingCIs.length > 0) {
        query = query.in(
          "campaign_influencer_id",
          matchingCIs.map((ci) => ci.id)
        );
      } else {
        // No matching influencer in this campaign
        return NextResponse.json<PaginatedResponse<OutreachMessage>>({
          data: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
        });
      }
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (messageType) {
      query = query.eq("message_type", messageType);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data: messages, error: messagesError, count } = await query;

    if (messagesError) {
      console.error("Error fetching outreach messages:", messagesError);
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch outreach messages",
            status: 500,
          },
        },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json<PaginatedResponse<OutreachMessage>>({
      data: messages || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/campaigns/[id]/outreach:", error);
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
// POST - Save/create an outreach message
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
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
            message: "You must be logged in to save outreach messages",
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
    const body: SaveOutreachRequest = await request.json();
    const {
      campaign_influencer_id,
      content,
      subject,
      message_type = "initial",
      generated_by_ai = false,
      ai_metadata,
      scheduled_for,
    } = body;

    // Validate required fields
    if (!campaign_influencer_id || !content) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "campaign_influencer_id and content are required",
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    // Verify campaign influencer exists and belongs to this campaign
    const { data: campaignInfluencer } = await supabase
      .from("campaign_influencers")
      .select("id, campaign_id, influencer_id")
      .eq("id", campaign_influencer_id)
      .eq("campaign_id", campaignId)
      .single();

    if (!campaignInfluencer) {
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

    // Verify campaign belongs to user's organization
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("organization_id", membership.organization_id)
      .single();

    if (!campaign) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Campaign not found",
            status: 404,
          },
        },
        { status: 404 }
      );
    }

    // Create the outreach message
    const { data: message, error: insertError } = await supabase
      .from("outreach_messages")
      .insert({
        campaign_influencer_id,
        message_type,
        subject: subject || null,
        body: content,
        ai_generated: generated_by_ai,
        ai_prompt: ai_metadata ? JSON.stringify(ai_metadata) : null,
        personalization_data: ai_metadata
          ? { metadata: ai_metadata }
          : null,
        status: scheduled_for ? "scheduled" : "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating outreach message:", insertError);
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to save outreach message",
            status: 500,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<OutreachMessage>>(
      {
        data: message,
        error: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/campaigns/[id]/outreach:", error);
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
// PATCH - Update an outreach message (e.g., mark as sent, update status)
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
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
            message: "You must be logged in to update outreach messages",
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
    const body = await request.json();
    const {
      message_id,
      status,
      content,
      subject,
      reply_content,
    } = body;

    if (!message_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "message_id is required",
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    // Verify message exists and belongs to a campaign influencer in this campaign
    const { data: existingMessage } = await supabase
      .from("outreach_messages")
      .select(`
        id,
        campaign_influencer_id,
        campaign_influencers!inner (
          campaign_id,
          campaigns!inner (
            organization_id
          )
        )
      `)
      .eq("id", message_id)
      .single();

    if (!existingMessage) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Message not found",
            status: 404,
          },
        },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;

      // Set timestamp based on status
      if (status === "sent") {
        updateData.sent_at = new Date().toISOString();
      } else if (status === "opened") {
        updateData.opened_at = new Date().toISOString();
      } else if (status === "replied") {
        updateData.replied_at = new Date().toISOString();
        if (reply_content) {
          updateData.reply_content = reply_content;
        }
      }
    }

    if (content !== undefined) {
      updateData.body = content;
    }

    if (subject !== undefined) {
      updateData.subject = subject;
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from("outreach_messages")
      .update(updateData)
      .eq("id", message_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating outreach message:", updateError);
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to update outreach message",
            status: 500,
          },
        },
        { status: 500 }
      );
    }

    // If status changed to sent/contacted, update the campaign influencer stage
    if (status === "sent") {
      await supabase
        .from("campaign_influencers")
        .update({
          stage: "contacted",
          stage_changed_at: new Date().toISOString(),
        })
        .eq("id", existingMessage.campaign_influencer_id)
        .in("stage", ["discovered", "researching", "outreach_pending"]);
    }

    return NextResponse.json<ApiResponse<OutreachMessage>>({
      data: updatedMessage,
      error: null,
    });
  } catch (error) {
    console.error("Error in PATCH /api/campaigns/[id]/outreach:", error);
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
