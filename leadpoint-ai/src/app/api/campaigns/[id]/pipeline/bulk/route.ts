import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { PipelineStage } from "@/types/database"
import type { ApiResponse } from "@/types/api"

// Pipeline stages
const PIPELINE_STAGES: PipelineStage[] = [
  "discovered",
  "researching",
  "outreach_pending",
  "contacted",
  "in_negotiation",
  "deal_signed",
  "content_in_progress",
  "content_posted",
  "completed",
  "declined",
  "unresponsive",
]

// PATCH - Bulk move multiple influencers to a new stage
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to move influencers",
            status: 401,
          },
        },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NO_ORGANIZATION",
            message: "You must be part of an organization to move influencers",
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    // Verify campaign belongs to organization
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("organization_id", membership.organization_id)
      .single()

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
      )
    }

    // Parse request body
    const body = await request.json()
    const { campaignInfluencerIds, toStage, notes } = body

    if (!campaignInfluencerIds || !Array.isArray(campaignInfluencerIds) || campaignInfluencerIds.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "campaignInfluencerIds must be a non-empty array",
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    if (!toStage) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "toStage is required",
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    // Validate stage
    if (!PIPELINE_STAGES.includes(toStage)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid pipeline stage",
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    // Verify all campaign influencers exist and belong to this campaign
    const { data: existingCIs, error: ciError } = await supabase
      .from("campaign_influencers")
      .select("id")
      .eq("campaign_id", campaignId)
      .in("id", campaignInfluencerIds)

    if (ciError) {
      console.error("Error verifying campaign influencers:", ciError)
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to verify influencers",
            status: 500,
          },
        },
        { status: 500 }
      )
    }

    const validIds = existingCIs?.map((ci) => ci.id) || []
    if (validIds.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "No valid influencers found in this campaign",
            status: 404,
          },
        },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      stage: toStage,
      stage_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Update all campaign influencers
    const { error: updateError } = await supabase
      .from("campaign_influencers")
      .update(updateData)
      .in("id", validIds)

    if (updateError) {
      console.error("Error updating campaign influencers:", updateError)
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to move influencers",
            status: 500,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<{ success: boolean; count: number }>>({
      data: { success: true, count: validIds.length },
      error: null,
    })
  } catch (error) {
    console.error("Unexpected error in PATCH /api/campaigns/[id]/pipeline/bulk:", error)
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
    )
  }
}
