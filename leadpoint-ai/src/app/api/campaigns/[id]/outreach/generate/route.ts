import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateOutreach,
  generateVariations,
  buildOutreachParams,
  OutreachError,
  OutreachErrorCodes,
} from "@/lib/anthropic/outreach";
import {
  checkAIRateLimit,
  rateLimitResponse,
  withRateLimitHeaders,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types/api";
import type {
  GenerateOutreachRequest,
  GenerateOutreachResponse,
} from "@/types/outreach";
import type { Influencer, Campaign, Organization, SubscriptionPlan } from "@/types/database";

// ============================================================================
// POST - Generate AI outreach message
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
            message: "You must be logged in to generate outreach messages",
            status: 401,
          },
        },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
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

    // Get organization for subscription plan and brand guidelines
    const { data: organization } = await supabase
      .from("organizations")
      .select("name, subscription_plan, settings")
      .eq("id", membership.organization_id)
      .single();

    const subscriptionPlan: SubscriptionPlan = organization?.subscription_plan || "free";

    // Check rate limits (use org ID as identifier for consistent team limits)
    const rateLimitResult = checkAIRateLimit(membership.organization_id, subscriptionPlan);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    // Parse request body
    const body: GenerateOutreachRequest = await request.json();
    const {
      influencer_id,
      campaign_influencer_id,
      tone = "friendly",
      message_type = "initial",
      additional_context,
      generate_variations = false,
      variation_count = 3,
      include_subject = false,
      max_length = 150,
      custom_product_info,
    } = body;

    if (!influencer_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "influencer_id is required",
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    // Verify campaign exists and belongs to organization
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("organization_id", membership.organization_id)
      .single();

    if (campaignError || !campaign) {
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

    // Get influencer data
    const { data: influencer, error: influencerError } = await supabase
      .from("influencers")
      .select("*")
      .eq("id", influencer_id)
      .eq("organization_id", membership.organization_id)
      .single();

    if (influencerError || !influencer) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Influencer not found",
            status: 404,
          },
        },
        { status: 404 }
      );
    }

    // Build outreach params
    const outreachParams = buildOutreachParams(
      influencer as Influencer,
      campaign as Campaign,
      organization as Organization | undefined,
      {
        tone,
        messageType: message_type,
        includeSubject: include_subject,
        maxLength: max_length,
        additionalContext: additional_context,
        // Allow custom product info to override campaign data
        ...(custom_product_info?.name && { productName: custom_product_info.name }),
        ...(custom_product_info?.description && {
          productDescription: custom_product_info.description,
        }),
        ...(custom_product_info?.campaign_goal && {
          campaignGoal: custom_product_info.campaign_goal,
        }),
        ...(custom_product_info?.offer && { offer: custom_product_info.offer }),
      }
    );

    // If this is a follow-up or negotiation, get previous messages
    if (
      campaign_influencer_id &&
      (message_type === "follow_up" || message_type === "negotiation")
    ) {
      const { data: previousMessages } = await supabase
        .from("outreach_messages")
        .select("body, sent_at")
        .eq("campaign_influencer_id", campaign_influencer_id)
        .order("sent_at", { ascending: false })
        .limit(5);

      if (previousMessages && previousMessages.length > 0) {
        outreachParams.previousMessages = previousMessages.map((msg) => ({
          body: msg.body,
          sentAt: msg.sent_at,
          daysSince: msg.sent_at
            ? `${Math.floor((Date.now() - new Date(msg.sent_at).getTime()) / (1000 * 60 * 60 * 24))} days ago`
            : undefined,
        }));
      }
    }

    // Generate the outreach message
    const result = await generateOutreach(outreachParams);

    // Generate variations if requested
    let variations: string[] | undefined;
    if (generate_variations) {
      variations = await generateVariations(outreachParams, variation_count);
    }

    // Build response
    const response: GenerateOutreachResponse = {
      message: result.message,
      subject: result.subject,
      variations,
      influencer: {
        id: influencer.id,
        username: influencer.username,
        display_name: influencer.display_name,
        platform: influencer.platform,
      },
      metadata: result.metadata,
      // TODO: Implement credit tracking
      credits_used: 1,
      credits_remaining: 999,
    };

    // Add rate limit headers to successful response
    const jsonResponse = NextResponse.json<ApiResponse<GenerateOutreachResponse>>({
      data: response,
      error: null,
    });
    return withRateLimitHeaders(jsonResponse, rateLimitResult);
  } catch (error) {
    console.error("Error in POST /api/campaigns/[id]/outreach/generate:", error);

    // Handle custom outreach errors
    if (error instanceof OutreachError) {
      const statusMap: Record<string, number> = {
        [OutreachErrorCodes.RATE_LIMIT]: 429,
        [OutreachErrorCodes.AUTH_ERROR]: 401,
        [OutreachErrorCodes.INVALID_PARAMS]: 400,
        [OutreachErrorCodes.INFLUENCER_NOT_FOUND]: 404,
        [OutreachErrorCodes.CAMPAIGN_NOT_FOUND]: 404,
        [OutreachErrorCodes.INSUFFICIENT_CREDITS]: 402,
      };

      const status = statusMap[error.code] || 500;

      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: error.code,
            message: error.message,
            status,
            details: error.details,
          },
        },
        { status }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while generating the outreach message",
          status: 500,
        },
      },
      { status: 500 }
    );
  }
}
