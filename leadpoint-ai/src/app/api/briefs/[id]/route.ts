import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { ContentBrief } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

interface UpdateBriefRequest {
  title?: string;
  hook_options?: string[];
  talking_points?: string[];
  call_to_action?: string;
  restrictions?: string[];
  dos_and_donts?: { dos: string[]; donts: string[] };
  estimated_duration?: string;
  format_suggestion?: ContentBrief["format_suggestion"];
  status?: ContentBrief["status"];
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

// ============================================================================
// GET - Fetch a single brief by ID
// ============================================================================

export async function GET(
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
            message: "You must be logged in to view briefs",
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

    // Query brief from database
    // RLS policies will enforce organization access
    const { data: brief, error: briefError } = await supabase
      .from("content_briefs")
      .select("*")
      .eq("id", id)
      .single();

    if (briefError) {
      if (briefError.code === "PGRST116") {
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
      throw briefError;
    }

    // Verify the brief belongs to a campaign in user's organization
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("organization_id")
      .eq("id", brief.campaign_id)
      .single();

    if (campaignError || !campaign || campaign.organization_id !== membership.organization_id) {
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

    return NextResponse.json<ApiResponse<ContentBrief>>({
      data: transformToContentBrief(brief),
      error: null,
    });
  } catch (error) {
    console.error("Error in GET /api/briefs/[id]:", error);

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
// PATCH - Update a brief
// ============================================================================

export async function PATCH(
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
            message: "You must be logged in to update briefs",
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

    // First verify the brief exists and user has access
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

    const body: UpdateBriefRequest = await request.json();

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.hook_options !== undefined) updateData.hook_options = body.hook_options;
    if (body.talking_points !== undefined) updateData.talking_points = body.talking_points;
    if (body.call_to_action !== undefined) updateData.call_to_action = body.call_to_action;
    if (body.restrictions !== undefined) updateData.restrictions = body.restrictions;
    if (body.dos_and_donts !== undefined) updateData.dos_and_donts = body.dos_and_donts;
    if (body.estimated_duration !== undefined) updateData.estimated_duration = body.estimated_duration;
    if (body.format_suggestion !== undefined) updateData.format_suggestion = body.format_suggestion;
    if (body.status !== undefined) {
      updateData.status = body.status;
      // Update status-specific timestamps
      if (body.status === "sent") {
        updateData.sent_at = new Date().toISOString();
      } else if (body.status === "approved") {
        updateData.approved_at = new Date().toISOString();
      }
    }

    // Update in database
    const { data: updatedBrief, error: updateError } = await supabase
      .from("content_briefs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating brief:", updateError);
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to update brief",
            status: 500,
            details: { reason: updateError.message },
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<ContentBrief>>({
      data: transformToContentBrief(updatedBrief),
      error: null,
    });
  } catch (error) {
    console.error("Error in PATCH /api/briefs/[id]:", error);

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
// DELETE - Delete a brief
// ============================================================================

export async function DELETE(
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
            message: "You must be logged in to delete briefs",
            status: 401,
          },
        },
        { status: 401 }
      );
    }

    // Get user's organization and role
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

    // First verify the brief exists and user has access
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

    // Check role for delete permission (owner or admin only per RLS policy)
    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "Only owners and admins can delete briefs",
            status: 403,
          },
        },
        { status: 403 }
      );
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("content_briefs")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting brief:", deleteError);
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to delete brief",
            status: 500,
            details: { reason: deleteError.message },
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      data: { deleted: true },
      error: null,
    });
  } catch (error) {
    console.error("Error in DELETE /api/briefs/[id]:", error);

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
