import { NextRequest, NextResponse } from 'next/server'
import { createClient, isDevMode } from '@/lib/supabase/server'
import type { Campaign, PipelineStage } from '@/types/database'
import type { ApiResponse, CampaignStats, CampaignActivity } from '@/types/api'

interface CampaignWithStats extends Campaign {
  stats: CampaignStats
  recentActivity: CampaignActivity[]
}

// Mock campaign detail for dev mode
function getMockCampaign(id: string): CampaignWithStats | null {
  const mockCampaigns: Record<string, CampaignWithStats> = {
    'mock-1': {
      id: 'mock-1',
      organization_id: 'mock-org',
      name: 'Summer Product Launch',
      description: 'Launch campaign for new summer collection',
      status: 'active',
      goals: { primary_goal: 'brand_awareness', kpis: ['reach', 'engagement'] },
      target_audience: { interests: ['fashion', 'lifestyle'] },
      budget_range: { min: 5000, max: 15000, currency: 'USD' },
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'mock-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stats: {
        totalInfluencers: 12,
        byStage: {
          discovered: 3,
          researching: 2,
          outreach_pending: 1,
          contacted: 2,
          in_negotiation: 1,
          deal_signed: 1,
          content_in_progress: 1,
          content_posted: 1,
          completed: 0,
          declined: 0,
          unresponsive: 0,
        },
        totalReach: 250000,
        totalEngagement: 15000,
        totalSpend: 4500,
        averageEngagementRate: 6.0,
        messagessSent: 15,
        responseRate: 60,
        postsPublished: 8,
      },
      recentActivity: [
        { id: '1', type: 'influencer_added', description: '12 influencer(s) in pipeline', createdAt: new Date().toISOString() },
      ],
    },
    'mock-2': {
      id: 'mock-2',
      organization_id: 'mock-org',
      name: 'Fitness Challenge',
      description: '30-day fitness challenge with influencers',
      status: 'draft',
      goals: { primary_goal: 'engagement', kpis: ['comments', 'shares'] },
      target_audience: { interests: ['fitness', 'wellness', 'health'] },
      budget_range: { min: 2000, max: 8000, currency: 'USD' },
      start_date: null,
      end_date: null,
      created_by: 'mock-user',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      stats: {
        totalInfluencers: 5,
        byStage: {
          discovered: 5,
          researching: 0,
          outreach_pending: 0,
          contacted: 0,
          in_negotiation: 0,
          deal_signed: 0,
          content_in_progress: 0,
          content_posted: 0,
          completed: 0,
          declined: 0,
          unresponsive: 0,
        },
        totalReach: 0,
        totalEngagement: 0,
        totalSpend: 0,
        averageEngagementRate: 0,
        messagessSent: 0,
        responseRate: 0,
        postsPublished: 0,
      },
      recentActivity: [],
    },
  }

  // Check for exact match first
  if (mockCampaigns[id]) {
    return mockCampaigns[id]
  }

  // For dynamically created mock campaigns (e.g., mock-1768625301422)
  if (id.startsWith('mock-')) {
    return {
      id,
      organization_id: 'mock-org',
      name: 'New Campaign',
      description: 'A newly created campaign',
      status: 'draft',
      goals: { primary_goal: 'brand_awareness', kpis: ['reach', 'engagement'] },
      target_audience: { interests: ['general'] },
      budget_range: null,
      start_date: null,
      end_date: null,
      created_by: 'mock-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stats: {
        totalInfluencers: 0,
        byStage: {
          discovered: 0,
          researching: 0,
          outreach_pending: 0,
          contacted: 0,
          in_negotiation: 0,
          deal_signed: 0,
          content_in_progress: 0,
          content_posted: 0,
          completed: 0,
          declined: 0,
          unresponsive: 0,
        },
        totalReach: 0,
        totalEngagement: 0,
        totalSpend: 0,
        averageEngagementRate: 0,
        messagessSent: 0,
        responseRate: 0,
        postsPublished: 0,
      },
      recentActivity: [],
    }
  }

  return null
}

// GET - Get a single campaign by ID with stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Dev mode - return mock data
    if (isDevMode()) {
      const mockCampaign = getMockCampaign(id)
      if (mockCampaign) {
        return NextResponse.json<ApiResponse<CampaignWithStats>>({
          data: mockCampaign,
          error: null,
        })
      }
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Campaign not found',
            status: 404,
          },
        },
        { status: 404 }
      )
    }

    const supabase = await createClient()

    // Handle null supabase client
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database service is not available',
            status: 503,
          },
        },
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
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to view this campaign',
            status: 401,
          },
        },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'You must be part of an organization to view campaigns',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Campaign not found',
            status: 404,
          },
        },
        { status: 404 }
      )
    }

    // Get campaign influencers with their stages
    const { data: campaignInfluencers } = await supabase
      .from('campaign_influencers')
      .select('id, stage, contract_value, influencer_id')
      .eq('campaign_id', id)

    // Calculate stats by stage
    const stages: PipelineStage[] = [
      'discovered',
      'researching',
      'outreach_pending',
      'contacted',
      'in_negotiation',
      'deal_signed',
      'content_in_progress',
      'content_posted',
      'completed',
      'declined',
      'unresponsive',
    ]

    const byStage: Record<PipelineStage, number> = stages.reduce(
      (acc, stage) => ({ ...acc, [stage]: 0 }),
      {} as Record<PipelineStage, number>
    )

    let totalSpend = 0
    const influencerIds: string[] = []

    ;(campaignInfluencers || []).forEach((ci) => {
      if (ci.stage && byStage[ci.stage as PipelineStage] !== undefined) {
        byStage[ci.stage as PipelineStage]++
      }
      if (ci.contract_value) {
        totalSpend += ci.contract_value
      }
      influencerIds.push(ci.influencer_id)
    })

    // Get content posts for this campaign's influencers
    const campaignInfluencerIds = (campaignInfluencers || []).map((ci) => ci.id)

    let postsPublished = 0
    let totalReach = 0
    let totalEngagement = 0

    if (campaignInfluencerIds.length > 0) {
      const { data: contentPosts } = await supabase
        .from('content_posts')
        .select('metrics, status')
        .in('campaign_influencer_id', campaignInfluencerIds)

      ;(contentPosts || []).forEach((post) => {
        if (post.status === 'published') {
          postsPublished++
          if (post.metrics) {
            totalReach += (post.metrics as { reach?: number }).reach || 0
            totalEngagement +=
              ((post.metrics as { likes?: number }).likes || 0) +
              ((post.metrics as { comments?: number }).comments || 0) +
              ((post.metrics as { shares?: number }).shares || 0)
          }
        }
      })
    }

    // Get outreach messages count
    let messagesSent = 0
    let messagesReplied = 0

    if (campaignInfluencerIds.length > 0) {
      const { data: messages } = await supabase
        .from('outreach_messages')
        .select('status')
        .in('campaign_influencer_id', campaignInfluencerIds)

      ;(messages || []).forEach((msg) => {
        if (msg.status === 'sent' || msg.status === 'opened' || msg.status === 'replied') {
          messagesSent++
        }
        if (msg.status === 'replied') {
          messagesReplied++
        }
      })
    }

    const responseRate = messagesSent > 0 ? (messagesReplied / messagesSent) * 100 : 0
    const averageEngagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0

    const stats: CampaignStats = {
      totalInfluencers: campaignInfluencers?.length || 0,
      byStage,
      totalReach,
      totalEngagement,
      totalSpend,
      averageEngagementRate,
      messagessSent: messagesSent,
      responseRate,
      postsPublished,
    }

    // Build recent activity (simplified - in production, you'd have an activity log table)
    const recentActivity: CampaignActivity[] = []

    // Add some sample activity based on campaign data
    if (campaignInfluencers && campaignInfluencers.length > 0) {
      recentActivity.push({
        id: '1',
        type: 'influencer_added',
        description: `${campaignInfluencers.length} influencer(s) in pipeline`,
        createdAt: campaign.created_at,
      })
    }

    const campaignWithStats: CampaignWithStats = {
      ...campaign,
      stats,
      recentActivity,
    }

    return NextResponse.json<ApiResponse<CampaignWithStats>>({
      data: campaignWithStats,
      error: null,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/campaigns/[id]:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}

// PATCH - Update a campaign
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Dev mode - simulate update
    if (isDevMode()) {
      const body = await request.json()
      const mockCampaign = getMockCampaign(id)
      if (!mockCampaign) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: { code: 'NOT_FOUND', message: 'Campaign not found', status: 404 } },
          { status: 404 }
        )
      }
      // Return updated mock campaign
      const updatedCampaign: Campaign = {
        ...mockCampaign,
        ...body,
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json<ApiResponse<Campaign>>({ data: updatedCampaign, error: null })
    }

    const supabase = await createClient()

    // Handle null supabase client
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: { code: 'SERVICE_UNAVAILABLE', message: 'Database service is not available', status: 503 } },
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
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to update this campaign',
            status: 401,
          },
        },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'You must be part of an organization to update campaigns',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    // Check if campaign exists and belongs to user's organization
    const { data: existingCampaign, error: findError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (findError || !existingCampaign) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Campaign not found',
            status: 404,
          },
        },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      name,
      description,
      status,
      target_niche,
      hashtags,
      budget,
      start_date,
      end_date,
      goals,
      target_audience,
    } = body

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json<ApiResponse<null>>(
          {
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Campaign name cannot be empty',
              status: 400,
            },
          },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'active', 'paused', 'completed', 'archived']
      if (!validStatuses.includes(status)) {
        return NextResponse.json<ApiResponse<null>>(
          {
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid status',
              status: 400,
            },
          },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    if (target_niche !== undefined || hashtags !== undefined) {
      const newTargetAudience = target_audience || {}
      if (target_niche) {
        newTargetAudience.interests = [target_niche, ...(hashtags || [])]
      }
      updateData.target_audience = newTargetAudience
    }

    if (budget !== undefined) {
      updateData.budget_range = budget
        ? {
            min: 0,
            max: budget,
            currency: 'USD',
          }
        : null
    }

    if (start_date !== undefined) {
      updateData.start_date = start_date || null
    }

    if (end_date !== undefined) {
      updateData.end_date = end_date || null
    }

    if (goals !== undefined) {
      updateData.goals = goals
    }

    // Update campaign
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating campaign:', updateError)
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to update campaign',
            status: 500,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<Campaign>>({
      data: updatedCampaign,
      error: null,
    })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/campaigns/[id]:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete a campaign (set status to 'archived')
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Dev mode - simulate delete
    if (isDevMode()) {
      const mockCampaign = getMockCampaign(id)
      if (!mockCampaign) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: { code: 'NOT_FOUND', message: 'Campaign not found', status: 404 } },
          { status: 404 }
        )
      }
      // Return archived mock campaign
      const archivedCampaign: Campaign = {
        ...mockCampaign,
        status: 'archived',
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json<ApiResponse<Campaign>>({ data: archivedCampaign, error: null })
    }

    const supabase = await createClient()

    // Handle null supabase client
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: { code: 'SERVICE_UNAVAILABLE', message: 'Database service is not available', status: 503 } },
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
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to delete this campaign',
            status: 401,
          },
        },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'You must be part of an organization to delete campaigns',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    // Check if campaign exists and belongs to user's organization
    const { data: existingCampaign, error: findError } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (findError || !existingCampaign) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Campaign not found',
            status: 404,
          },
        },
        { status: 404 }
      )
    }

    // Soft delete by setting status to 'archived'
    const { data: archivedCampaign, error: archiveError } = await supabase
      .from('campaigns')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (archiveError) {
      console.error('Error archiving campaign:', archiveError)
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to archive campaign',
            status: 500,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<Campaign>>({
      data: archivedCampaign,
      error: null,
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/campaigns/[id]:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}
