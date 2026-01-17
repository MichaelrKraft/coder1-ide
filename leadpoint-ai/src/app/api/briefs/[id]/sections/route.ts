import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { regenerateBriefSection } from "@/lib/anthropic/briefs";
import type { ApiResponse } from "@/types/api";
import type { ContentBrief } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

type RegeneratableSection = "hooks" | "talking_points" | "cta" | "dos_donts" | "product_mentions";

interface RegenerateSectionRequest {
  section: RegeneratableSection;
  feedback?: string;
}

interface RegenerateSectionResponse {
  brief: ContentBrief;
  regenerated_section: RegeneratableSection;
  metadata: {
    regenerated_at: string;
  };
}

// ============================================================================
// Helper: Transform database row to ContentBrief type
// ============================================================================

function transformToContentBrief(row: Record<string, unknown>): ContentBrief {
  return {
    id: row.id as string,
    campaign_id: row.campaign_id as string,
    influencer_id: row.influencer_id as string,
    campaign_influencer_id: row.campaign_influencer_id as string,
    title: row.title as string,
    hook_options: row.hook_options as string[],
    talking_points: row.talking_points as string[],
    call_to_action: row.call_to_action as string,
    product_mentions: row.product_mentions as ContentBrief["product_mentions"],
    influencer_style_analysis: row.influencer_style_analysis as ContentBrief["influencer_style_analysis"],
    restrictions: row.restrictions as string[],
    dos_and_donts: row.dos_and_donts as ContentBrief["dos_and_donts"],
    estimated_duration: row.estimated_duration as string,
    format_suggestion: row.format_suggestion as ContentBrief["format_suggestion"],
    status: row.status as ContentBrief["status"],
    ai_generated: row.ai_generated as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// Mapping from request section names to database field names
const sectionToFieldMap: Record<RegeneratableSection, keyof ContentBrief> = {
  hooks: "hook_options",
  talking_points: "talking_points",
  cta: "call_to_action",
  dos_donts: "dos_and_donts",
  product_mentions: "product_mentions",
};

const validSections: RegeneratableSection[] = [
  "hooks",
  "talking_points",
  "cta",
  "dos_donts",
  "product_mentions",
];

// ============================================================================
// POST - Regenerate a specific section of a brief
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
            message: "You must be logged in to regenerate brief sections",
            status: 401,
          },
        },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
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

    // Parse and validate request body
    const body: RegenerateSectionRequest = await request.json();
    const { section, feedback } = body;

    if (!section || !validSections.includes(section)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid section. Must be one of: ${validSections.join(", ")}`,
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    // Fetch the brief with organization access check
    const { data: existingBrief, error: fetchError } = await supabase
      .from("content_briefs")
      .select("*, campaigns:campaign_id(organization_id)")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json<ApiResponse<null>>(
          {
            data: null,
            error: {
              code: "NOT_FOUND",
              message: "Brief not found",
              status: 404,
            },
          },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    // Verify organization access
    const campaign = existingBrief.campaigns as { organization_id: string } | null;
    if (!campaign || campaign.organization_id !== membership.organization_id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this brief",
            status: 403,
          },
        },
        { status: 403 }
      );
    }

    // Transform to ContentBrief for the regeneration function
    const briefForRegeneration = transformToContentBrief(existingBrief);

    // Regenerate the section using AI
    const regeneratedContent = await regenerateBriefSection({
      brief: briefForRegeneration,
      section,
      feedback,
    });

    // Build update object based on which section was regenerated
    const updateData: Record<string, unknown> = {};
    const fieldName = sectionToFieldMap[section];

    if (regeneratedContent[fieldName] !== undefined) {
      updateData[fieldName] = regeneratedContent[fieldName];
    } else {
      // If AI didn't return expected field, return error
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "GENERATION_ERROR",
            message: "Failed to regenerate section content",
            status: 500,
          },
        },
        { status: 500 }
      );
    }

    // Update the brief in database
    const { data: updatedBrief, error: updateError } = await supabase
      .from("content_briefs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating brief section:", updateError);
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to save regenerated section",
            status: 500,
            details: { reason: updateError.message },
          },
        },
        { status: 500 }
      );
    }

    const response: RegenerateSectionResponse = {
      brief: transformToContentBrief(updatedBrief),
      regenerated_section: section,
      metadata: {
        regenerated_at: new Date().toISOString(),
      },
    };

    return NextResponse.json<ApiResponse<RegenerateSectionResponse>>({
      data: response,
      error: null,
    });
  } catch (error) {
    console.error("Error in POST /api/briefs/[id]/sections:", error);

    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while regenerating the section",
          status: 500,
        },
      },
      { status: 500 }
    );
  }
}
