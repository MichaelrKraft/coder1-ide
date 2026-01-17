import { NextRequest, NextResponse } from "next/server"
import { createClient, isDevMode } from "@/lib/supabase/server"
import type { PipelineStage } from "@/types/database"
import type { ApiResponse, PipelineResponse } from "@/types/api"

// Mock influencers for dev mode
const mockInfluencerData = [
  { id: 'inf-1', username: 'fitness_guru_jane', display_name: 'Jane Fitness', avatar_url: null, platform: 'instagram', follower_count: 125000, engagement_rate: 4.2 },
  { id: 'inf-2', username: 'healthy_mike', display_name: 'Mike Health', avatar_url: null, platform: 'instagram', follower_count: 85000, engagement_rate: 5.1 },
  { id: 'inf-3', username: 'yoga_sarah', display_name: 'Sarah Yoga', avatar_url: null, platform: 'instagram', follower_count: 210000, engagement_rate: 3.8 },
  { id: 'inf-4', username: 'tech_reviews_tom', display_name: 'Tom Tech', avatar_url: null, platform: 'youtube', follower_count: 450000, engagement_rate: 6.2 },
  { id: 'inf-5', username: 'beauty_lisa', display_name: 'Lisa Beauty', avatar_url: null, platform: 'tiktok', follower_count: 320000, engagement_rate: 7.5 },
]

// Helper to create mock campaign influencer with proper structure
function createMockCampaignInfluencer(influencer: typeof mockInfluencerData[0], stage: PipelineStage, campaignId: string) {
  return {
    id: `ci-${influencer.id}`,
    campaign_id: campaignId,
    influencer_id: influencer.id,
    stage,
    score: { overall: Math.floor(Math.random() * 30) + 70 },
    notes: null,
    contract_value: null,
    contract_currency: 'USD',
    deliverables: null,
    stage_changed_at: new Date().toISOString(),
    added_by: 'mock-user',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    influencer: {
      id: influencer.id,
      username: influencer.username,
      display_name: influencer.display_name,
      avatar_url: influencer.avatar_url,
      platform: influencer.platform,
      follower_count: influencer.follower_count,
      engagement_rate: influencer.engagement_rate,
    },
    lastMessage: null,
  }
}

// Pipeline stages in order
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

// GET - Get all influencers in pipeline grouped by stage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    // Dev mode - return mock pipeline data as array (matching production structure)
    if (isDevMode()) {
      // Build stages array matching production format
      const mockStages = PIPELINE_STAGES.map((stage) => {
        let stageInfluencers: ReturnType<typeof createMockCampaignInfluencer>[] = []

        // Distribute mock influencers across stages
        switch (stage) {
          case 'discovered':
            stageInfluencers = [
              createMockCampaignInfluencer(mockInfluencerData[0], stage, campaignId),
              createMockCampaignInfluencer(mockInfluencerData[1], stage, campaignId),
            ]
            break
          case 'researching':
            stageInfluencers = [
              createMockCampaignInfluencer(mockInfluencerData[2], stage, campaignId),
            ]
            break
          case 'contacted':
            stageInfluencers = [
              createMockCampaignInfluencer(mockInfluencerData[3], stage, campaignId),
            ]
            break
          case 'in_negotiation':
            stageInfluencers = [
              createMockCampaignInfluencer(mockInfluencerData[4], stage, campaignId),
            ]
            break
          default:
            stageInfluencers = []
        }

        return {
          stage,
          count: stageInfluencers.length,
          influencers: stageInfluencers,
        }
      })

      return NextResponse.json({
        data: { stages: mockStages },
        error: null,
      })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not available', status: 503 } },
        { status: 503 }
      )
    }

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
            message: "You must be logged in to view pipeline",
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
            message: "You must be part of an organization to view pipeline",
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

    // Fetch campaign influencers with influencer data
    const { data: campaignInfluencers, error: influencersError } = await supabase
      .from("campaign_influencers")
      .select(
        `
        id,
        campaign_id,
        influencer_id,
        stage,
        score,
        notes,
        contract_value,
        contract_currency,
        deliverables,
        stage_changed_at,
        added_by,
        created_at,
        updated_at,
        influencers (
          id,
          username,
          display_name,
          avatar_url,
          platform,
          follower_count,
          engagement_rate
        )
      `
      )
      .eq("campaign_id", campaignId)
      .order("stage_changed_at", { ascending: false })

    if (influencersError) {
      console.error("Error fetching campaign influencers:", influencersError)
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch pipeline data",
            status: 500,
          },
        },
        { status: 500 }
      )
    }

    // Get last message for each campaign influencer
    const campaignInfluencerIds = campaignInfluencers?.map((ci) => ci.id) || []
    let messagesMap: Record<string, { sentAt: string; status: string }> = {}

    if (campaignInfluencerIds.length > 0) {
      const { data: messages } = await supabase
        .from("outreach_messages")
        .select("campaign_influencer_id, sent_at, status")
        .in("campaign_influencer_id", campaignInfluencerIds)
        .order("sent_at", { ascending: false })

      if (messages) {
        // Get the most recent message for each influencer
        messages.forEach((msg) => {
          if (!messagesMap[msg.campaign_influencer_id] && msg.sent_at) {
            messagesMap[msg.campaign_influencer_id] = {
              sentAt: msg.sent_at,
              status: msg.status,
            }
          }
        })
      }
    }

    // Group influencers by stage
    const stages = PIPELINE_STAGES.map((stage) => {
      const stageInfluencers = (campaignInfluencers || [])
        .filter((ci) => ci.stage === stage)
        .map((ci) => {
          // Supabase returns related data; could be object or array depending on relationship
          const influencerData = ci.influencers as unknown as {
            id: string
            username: string
            display_name: string
            avatar_url: string | null
            platform: string
            follower_count: number
            engagement_rate: number | null
          }

          return {
            id: ci.id,
            campaign_id: ci.campaign_id,
            influencer_id: ci.influencer_id,
            stage: ci.stage,
            score: ci.score,
            notes: ci.notes,
            contract_value: ci.contract_value,
            contract_currency: ci.contract_currency,
            deliverables: ci.deliverables,
            stage_changed_at: ci.stage_changed_at,
            added_by: ci.added_by,
            created_at: ci.created_at,
            updated_at: ci.updated_at,
            influencer: influencerData,
            lastMessage: messagesMap[ci.id] || null,
          }
        })

      return {
        stage,
        count: stageInfluencers.length,
        influencers: stageInfluencers,
      }
    })

    // Return the response without strict typing to avoid Supabase type inference issues
    return NextResponse.json({
      data: { stages },
      error: null,
    })
  } catch (error) {
    console.error("Unexpected error in GET /api/campaigns/[id]/pipeline:", error)
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

// PATCH - Move influencer to new stage
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
    const { campaignInfluencerId, toStage, notes } = body

    if (!campaignInfluencerId || !toStage) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "campaignInfluencerId and toStage are required",
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

    // Verify campaign influencer exists and belongs to this campaign
    const { data: existingCI, error: ciError } = await supabase
      .from("campaign_influencers")
      .select("id, stage")
      .eq("id", campaignInfluencerId)
      .eq("campaign_id", campaignId)
      .single()

    if (ciError || !existingCI) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Influencer not found in this campaign",
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

    // Update the campaign influencer
    const { error: updateError } = await supabase
      .from("campaign_influencers")
      .update(updateData)
      .eq("id", campaignInfluencerId)

    if (updateError) {
      console.error("Error updating campaign influencer:", updateError)
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to move influencer",
            status: 500,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<{ success: boolean }>>({
      data: { success: true },
      error: null,
    })
  } catch (error) {
    console.error("Unexpected error in PATCH /api/campaigns/[id]/pipeline:", error)
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
