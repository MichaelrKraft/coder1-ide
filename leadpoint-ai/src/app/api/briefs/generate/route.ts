import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateContentBrief,
  BriefError,
  BriefErrorCodes,
} from "@/lib/anthropic/briefs";
import {
  checkAIRateLimit,
  rateLimitResponse,
  withRateLimitHeaders,
} from "@/lib/rate-limit";
import {
  validateCreditsForOperation,
  deductCredits,
} from "@/lib/credits";
import { createApiLogger } from "@/lib/logger";
import {
  logRequest,
  logResponse,
  logRequestError,
  addUserContext,
  logAIOperation,
} from "@/lib/logger/request-logger";
import type { ApiResponse } from "@/types/api";
import type { ContentBrief, Influencer, Campaign, SubscriptionPlan } from "@/types/database";

// ============================================================================
// Logger
// ============================================================================

const logger = createApiLogger("briefs/generate");

// ============================================================================
// Types
// ============================================================================

interface GenerateBriefRequest {
  campaign_influencer_id: string;
  product_info?: {
    name: string;
    description: string;
    key_benefits: string[];
    target_audience?: string;
  };
  brand_guidelines?: string;
  restrictions?: string[];
  preferred_format?: ContentBrief["format_suggestion"];
}

interface GenerateBriefResponse {
  brief: ContentBrief;
  metadata: {
    model: string;
    generated_at: string;
    tokens_used: number;
    is_mock?: boolean;
  };
}

// ============================================================================
// POST - Generate AI content brief and save to database
// ============================================================================

export async function POST(request: NextRequest) {
  const reqLog = logRequest(request);

  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized brief generation attempt");
      const response = NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to generate content briefs",
            status: 401,
          },
        },
        { status: 401 }
      );
      return logResponse(reqLog, response);
    }

    // Add user context for logging
    addUserContext(reqLog, user.id);

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      logger.warn("User not in organization", { userId: user.id });
      const response = NextResponse.json<ApiResponse<null>>(
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
      return logResponse(reqLog, response);
    }

    // Update log context with organization
    addUserContext(reqLog, user.id, membership.organization_id);

    // Get organization for subscription plan and brand guidelines
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name, subscription_plan, settings")
      .eq("id", membership.organization_id)
      .single();

    const subscriptionPlan: SubscriptionPlan = orgData?.subscription_plan || "free";

    // Check rate limits (use org ID as identifier for consistent team limits)
    const rateLimitResult = checkAIRateLimit(membership.organization_id, subscriptionPlan);
    if (!rateLimitResult.allowed) {
      logger.warn("Rate limit exceeded for brief generation", {
        organizationId: membership.organization_id,
        plan: subscriptionPlan,
      });
      return logResponse(reqLog, rateLimitResponse(rateLimitResult));
    }

    // Check credit balance before proceeding
    const creditCheck = await validateCreditsForOperation(
      membership.organization_id,
      "brief_generation"
    );
    if (!creditCheck.allowed && creditCheck.errorResponse) {
      logger.warn("Insufficient credits for brief generation", {
        organizationId: membership.organization_id,
      });
      const response = NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: creditCheck.errorResponse.code,
            message: creditCheck.errorResponse.message,
            status: creditCheck.errorResponse.status,
            details: creditCheck.errorResponse.details,
          },
        },
        { status: creditCheck.errorResponse.status }
      );
      return logResponse(reqLog, response);
    }

    // Parse request body
    const body: GenerateBriefRequest = await request.json();
    const {
      campaign_influencer_id,
      product_info,
      brand_guidelines,
      restrictions,
      preferred_format,
    } = body;

    if (!campaign_influencer_id) {
      logger.warn("Missing campaign_influencer_id in request");
      const response = NextResponse.json<ApiResponse<null>>(
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
      return logResponse(reqLog, response);
    }

    logger.debug("Generating brief", {
      campaignInfluencerId: campaign_influencer_id,
      hasProductInfo: !!product_info,
      preferredFormat: preferred_format,
    });

    // Get campaign_influencer record with related data
    const { data: campaignInfluencer, error: ciError } = await supabase
      .from("campaign_influencers")
      .select(`
        id,
        campaign_id,
        influencer_id,
        campaigns:campaign_id (
          id,
          organization_id,
          name,
          description,
          goals,
          target_audience
        ),
        influencers:influencer_id (
          id,
          organization_id,
          platform,
          username,
          display_name,
          follower_count,
          engagement_rate,
          bio,
          categories,
          ai_analysis
        )
      `)
      .eq("id", campaign_influencer_id)
      .single();

    if (ciError || !campaignInfluencer) {
      logger.warn("Campaign influencer not found", {
        campaignInfluencerId: campaign_influencer_id,
      });
      const response = NextResponse.json<ApiResponse<null>>(
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
      return logResponse(reqLog, response);
    }

    // Type assertions for nested objects
    const campaign = campaignInfluencer.campaigns as unknown as Campaign;
    const influencer = campaignInfluencer.influencers as unknown as Influencer;

    // Verify organization ownership
    if (campaign.organization_id !== membership.organization_id) {
      logger.warn("Access denied to campaign", {
        campaignId: campaign.id,
        userOrgId: membership.organization_id,
        campaignOrgId: campaign.organization_id,
      });
      const response = NextResponse.json<ApiResponse<null>>(
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
      return logResponse(reqLog, response);
    }

    // Generate the brief using AI
    const aiStartTime = Date.now();
    const result = await generateContentBrief({
      influencer,
      campaign,
      campaignInfluencerId: campaign_influencer_id,
      productInfo: product_info
        ? {
            name: product_info.name,
            description: product_info.description,
            keyBenefits: product_info.key_benefits,
            targetAudience: product_info.target_audience,
          }
        : undefined,
      brandGuidelines:
        brand_guidelines || orgData?.settings?.brand_guidelines,
      restrictions,
      preferredFormat: preferred_format,
    });

    // Log AI operation
    logAIOperation(reqLog, "generateContentBrief", {
      model: result.metadata.model,
      tokensUsed: result.metadata.tokensUsed,
      durationMs: Date.now() - aiStartTime,
      success: true,
    });

    // Save brief to database
    const briefToInsert = {
      campaign_id: campaign.id,
      influencer_id: influencer.id,
      campaign_influencer_id: campaign_influencer_id,
      title: result.brief.title,
      hook_options: result.brief.hook_options,
      talking_points: result.brief.talking_points,
      call_to_action: result.brief.call_to_action,
      product_mentions: result.brief.product_mentions,
      influencer_style_analysis: result.brief.influencer_style_analysis,
      restrictions: result.brief.restrictions,
      dos_and_donts: result.brief.dos_and_donts,
      estimated_duration: result.brief.estimated_duration,
      format_suggestion: result.brief.format_suggestion,
      status: "draft" as const,
      ai_generated: true,
    };

    const { data: savedBrief, error: saveError } = await supabase
      .from("content_briefs")
      .insert(briefToInsert)
      .select()
      .single();

    if (saveError) {
      logger.error("Failed to save brief to database", {
        error: saveError.message,
        campaignId: campaign.id,
        influencerId: influencer.id,
      });
      const response = NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to save brief to database",
            status: 500,
            details: { reason: saveError.message },
          },
        },
        { status: 500 }
      );
      return logResponse(reqLog, response);
    }

    // Deduct credits AFTER successful generation and save
    // This ensures we don't charge for failed operations
    const deductResult = await deductCredits(
      membership.organization_id,
      "brief_generation"
    );
    if (!deductResult.success) {
      logger.warn("Failed to deduct credits, but brief was generated", {
        organizationId: membership.organization_id,
        error: deductResult.error,
      });
      // Don't fail the request - the operation succeeded, just log the issue
    }

    logger.info("Brief generated and saved successfully", {
      briefId: savedBrief.id,
      campaignId: campaign.id,
      influencerId: influencer.id,
      tokensUsed: result.metadata.tokensUsed,
      isMock: result.metadata.isMock,
    });

    // Transform database response to ContentBrief type
    const contentBrief: ContentBrief = {
      id: savedBrief.id,
      campaign_id: savedBrief.campaign_id,
      influencer_id: savedBrief.influencer_id,
      campaign_influencer_id: savedBrief.campaign_influencer_id,
      title: savedBrief.title,
      hook_options: savedBrief.hook_options as string[],
      talking_points: savedBrief.talking_points as string[],
      call_to_action: savedBrief.call_to_action,
      product_mentions: savedBrief.product_mentions as ContentBrief["product_mentions"],
      influencer_style_analysis: savedBrief.influencer_style_analysis as ContentBrief["influencer_style_analysis"],
      restrictions: savedBrief.restrictions as string[],
      dos_and_donts: savedBrief.dos_and_donts as ContentBrief["dos_and_donts"],
      estimated_duration: savedBrief.estimated_duration,
      format_suggestion: savedBrief.format_suggestion as ContentBrief["format_suggestion"],
      status: savedBrief.status as ContentBrief["status"],
      ai_generated: savedBrief.ai_generated,
      created_at: savedBrief.created_at,
      updated_at: savedBrief.updated_at,
    };

    const responseData: GenerateBriefResponse = {
      brief: contentBrief,
      metadata: {
        model: result.metadata.model,
        generated_at: result.metadata.generatedAt,
        tokens_used: result.metadata.tokensUsed,
        is_mock: result.metadata.isMock,
      },
    };

    // Add rate limit headers to successful response
    const jsonResponse = NextResponse.json<ApiResponse<GenerateBriefResponse>>({
      data: responseData,
      error: null,
    });
    return logResponse(reqLog, withRateLimitHeaders(jsonResponse, rateLimitResult));
  } catch (error) {
    // Handle custom brief errors
    if (error instanceof BriefError) {
      const statusMap: Record<string, number> = {
        [BriefErrorCodes.RATE_LIMIT]: 429,
        [BriefErrorCodes.AUTH_ERROR]: 401,
        [BriefErrorCodes.INVALID_PARAMS]: 400,
        [BriefErrorCodes.INFLUENCER_NOT_FOUND]: 404,
        [BriefErrorCodes.CAMPAIGN_NOT_FOUND]: 404,
      };

      const status = statusMap[error.code] || 500;

      logger.warn("Brief generation error", {
        errorCode: error.code,
        errorMessage: error.message,
      });

      const response = NextResponse.json<ApiResponse<null>>(
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
      return logResponse(reqLog, response);
    }

    // Log unexpected errors
    logRequestError(reqLog, error, {
      route: "briefs/generate",
    });

    const response = NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while generating the brief",
          status: 500,
        },
      },
      { status: 500 }
    );
    return logResponse(reqLog, response);
  }
}
