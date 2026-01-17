import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateMessage,
  getAnthropicClient,
  DEFAULT_MODEL,
} from "@/lib/anthropic/client";
import {
  buildEmailOutreachPrompt,
  parseEmailResponse,
} from "@/lib/anthropic/prompts";
import { getMockEmailOutreach } from "@/lib/anthropic/mock";
import {
  checkAIRateLimit,
  rateLimitResponse,
  withRateLimitHeaders,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types/api";
import type { Campaign, Influencer, CampaignInfluencer, SubscriptionPlan } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

interface GenerateEmailRequest {
  campaign_influencer_id: string;
  tone: "casual" | "professional";
  include_offer: boolean;
}

interface GenerateEmailResponse {
  subject: string;
  body: string;
  model: string;
}

// ============================================================================
// POST - Generate email content via Claude AI
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
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
            message: "You must be logged in to generate email outreach",
            status: 401,
          },
        },
        { status: 401 }
      );
    }

    // 2. Validate request body
    const body: GenerateEmailRequest = await request.json();
    const { campaign_influencer_id, tone, include_offer } = body;

    if (!campaign_influencer_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "campaign_influencer_id is required",
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    if (!tone || !["casual", "professional"].includes(tone)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "tone must be 'casual' or 'professional'",
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    // 3. Get user's organization membership
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

    // 3.5. Get organization for subscription plan (for rate limiting)
    const { data: orgForRateLimit } = await supabase
      .from("organizations")
      .select("subscription_plan")
      .eq("id", membership.organization_id)
      .single();

    const subscriptionPlan: SubscriptionPlan = orgForRateLimit?.subscription_plan || "free";

    // Check rate limits (use org ID as identifier for consistent team limits)
    const rateLimitResult = checkAIRateLimit(membership.organization_id, subscriptionPlan);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult);
    }

    // 4. Fetch campaign_influencer with influencer and campaign data
    const { data: campaignInfluencer, error: ciError } = await supabase
      .from("campaign_influencers")
      .select(`
        *,
        influencer:influencers(*),
        campaign:campaigns(*)
      `)
      .eq("id", campaign_influencer_id)
      .single();

    if (ciError || !campaignInfluencer) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Campaign influencer relationship not found",
            status: 404,
          },
        },
        { status: 404 }
      );
    }

    const influencer = campaignInfluencer.influencer as Influencer;
    const campaign = campaignInfluencer.campaign as Campaign;

    // 5. Verify campaign belongs to user's organization
    if (campaign.organization_id !== membership.organization_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this campaign",
            status: 403,
          },
        },
        { status: 403 }
      );
    }

    // 6. Get user profile for sender name
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // 7. Get organization for company name
    const { data: organization } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", membership.organization_id)
      .single();

    const senderName = userProfile?.full_name || user.email?.split("@")[0] || "Team";
    const companyName = organization?.name || "Our Company";

    // 8. Check if we have API access or need mock
    const client = getAnthropicClient();

    let subject: string;
    let body_text: string;
    let model: string;

    if (!client) {
      // Use mock response
      console.log("[Email Outreach] Using mock mode - no API key configured");
      const mockResult = getMockEmailOutreach(
        influencer.display_name || influencer.username,
        companyName
      );
      subject = mockResult.subject;
      body_text = mockResult.body;
      model = "mock";
    } else {
      // 9. Build email outreach prompt
      const { system, user: userPrompt } = buildEmailOutreachPrompt(
        campaign,
        influencer,
        {
          tone,
          includeOffer: include_offer,
          senderName,
          companyName,
        }
      );

      // 10. Call Claude API
      try {
        const response = await generateMessage(userPrompt, system, {
          maxTokens: 1024,
          temperature: 0.7,
        });

        // 11. Parse response into subject and body
        const parsed = parseEmailResponse(response);
        subject = parsed.subject;
        body_text = parsed.body;
        model = DEFAULT_MODEL;
      } catch (aiError) {
        console.error("[Email Outreach] AI generation error:", aiError);

        // Fallback to mock on AI error
        const mockResult = getMockEmailOutreach(
          influencer.display_name || influencer.username,
          companyName
        );
        subject = mockResult.subject;
        body_text = mockResult.body;
        model = "mock-fallback";
      }
    }

    // 12. Return generated content with rate limit headers
    const jsonResponse = NextResponse.json<ApiResponse<GenerateEmailResponse>>({
      data: {
        subject,
        body: body_text,
        model,
      },
      error: null,
    });
    return withRateLimitHeaders(jsonResponse, rateLimitResult);
  } catch (error) {
    console.error("Error in POST /api/outreach/generate-email:", error);

    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while generating the email",
          status: 500,
        },
      },
      { status: 500 }
    );
  }
}
