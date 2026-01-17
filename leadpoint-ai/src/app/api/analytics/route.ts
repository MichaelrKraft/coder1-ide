import { NextRequest, NextResponse } from 'next/server'
import { createClient, isDevMode } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types/api'
import type { Platform, PipelineStage, ContentPost, ContentMetrics } from '@/types/database'

// Analytics data types
export interface AnalyticsSummary {
  total_reach: number
  total_engagement: number
  total_posts: number
  active_influencers: number
  avg_engagement_rate: number
  total_views: number
  total_likes: number
  total_comments: number
  total_shares: number
}

export interface AnalyticsTrends {
  reach_change: number
  engagement_change: number
  posts_change: number
  influencers_change: number
}

export interface TimelineDataPoint {
  date: string
  views: number
  likes: number
  comments: number
  shares: number
  reach: number
  engagement: number
}

export interface TopContent {
  id: string
  title: string
  platform: Platform
  post_type: string
  post_url: string | null
  posted_at: string
  metrics: ContentMetrics
  influencer: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
}

export interface TopInfluencer {
  influencer: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    platform: Platform
  }
  total_views: number
  total_engagement: number
  posts_count: number
  avg_engagement_rate: number
}

export interface PipelineStats {
  discovered: number
  contacted: number
  responded: number
  negotiating: number
  confirmed: number
  posted: number
  completed: number
  conversion_rates: {
    discovered_to_contacted: number
    contacted_to_responded: number
    responded_to_confirmed: number
    confirmed_to_posted: number
  }
}

export interface AnalyticsData {
  summary: AnalyticsSummary
  trends: AnalyticsTrends
  timeline: TimelineDataPoint[]
  top_content: TopContent[]
  top_influencers: TopInfluencer[]
  pipeline_stats: PipelineStats
}

// Helper function to calculate percentage change
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// Helper function to calculate conversion rate
function calculateConversionRate(from: number, to: number): number {
  if (from === 0) return 0
  return (to / from) * 100
}

// GET - Fetch analytics data
export async function GET(request: NextRequest) {
  try {
    // Dev mode - return mock analytics data
    if (isDevMode()) {
      const mockAnalytics: AnalyticsData = {
        summary: {
          total_reach: 1250000,
          total_engagement: 87500,
          total_posts: 48,
          active_influencers: 12,
          avg_engagement_rate: 7.0,
          total_views: 1250000,
          total_likes: 75000,
          total_comments: 8500,
          total_shares: 4000,
        },
        trends: {
          reach_change: 15.2,
          engagement_change: 8.7,
          posts_change: 22.5,
          influencers_change: 12.0,
        },
        timeline: Array.from({ length: 30 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (29 - i))
          return {
            date: date.toISOString().split('T')[0],
            views: Math.floor(Math.random() * 50000) + 10000,
            likes: Math.floor(Math.random() * 3000) + 500,
            comments: Math.floor(Math.random() * 300) + 50,
            shares: Math.floor(Math.random() * 150) + 20,
            reach: Math.floor(Math.random() * 50000) + 10000,
            engagement: Math.floor(Math.random() * 3500) + 600,
          }
        }),
        top_content: [],
        top_influencers: [],
        pipeline_stats: {
          discovered: 45,
          contacted: 28,
          responded: 18,
          negotiating: 8,
          confirmed: 12,
          posted: 8,
          completed: 6,
          conversion_rates: {
            discovered_to_contacted: 62.2,
            contacted_to_responded: 64.3,
            responded_to_confirmed: 66.7,
            confirmed_to_posted: 66.7,
          },
        },
      }

      return NextResponse.json<ApiResponse<AnalyticsData>>({
        data: mockAnalytics,
        error: null,
      })
    }

    const supabase = await createClient()
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
            message: 'You must be logged in to view analytics',
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
            message: 'You must be part of an organization to view analytics',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Default date range to last 30 days
    const now = new Date()
    const defaultDateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const startDate = dateFrom ? new Date(dateFrom) : defaultDateFrom
    const endDate = dateTo ? new Date(dateTo) : now

    // Previous period for trend calculation
    const periodLength = endDate.getTime() - startDate.getTime()
    const previousStartDate = new Date(startDate.getTime() - periodLength)
    const previousEndDate = new Date(startDate.getTime() - 1)

    // Build base query for campaign influencers
    let campaignInfluencersQuery = supabase
      .from('campaign_influencers')
      .select(`
        id,
        campaign_id,
        influencer_id,
        stage,
        created_at,
        campaigns!inner(organization_id),
        influencers!inner(
          id,
          username,
          display_name,
          avatar_url,
          platform,
          follower_count,
          engagement_rate
        )
      `)
      .eq('campaigns.organization_id', membership.organization_id)

    if (campaignId) {
      campaignInfluencersQuery = campaignInfluencersQuery.eq('campaign_id', campaignId)
    }

    const { data: campaignInfluencers, error: influencersError } = await campaignInfluencersQuery

    if (influencersError) {
      console.error('Error fetching campaign influencers:', influencersError)
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch analytics data',
            status: 500,
          },
        },
        { status: 500 }
      )
    }

    // Get campaign influencer IDs
    const campaignInfluencerIds = (campaignInfluencers || []).map((ci: any) => ci.id)

    // Fetch content posts with metrics
    let contentQuery = supabase
      .from('content_posts')
      .select('*')
      .in('campaign_influencer_id', campaignInfluencerIds.length > 0 ? campaignInfluencerIds : ['none'])

    if (dateFrom) {
      contentQuery = contentQuery.gte('posted_at', startDate.toISOString())
    }
    if (dateTo) {
      contentQuery = contentQuery.lte('posted_at', endDate.toISOString())
    }

    const { data: contentPosts, error: contentError } = await contentQuery

    if (contentError) {
      console.error('Error fetching content posts:', contentError)
    }

    // Calculate summary metrics
    const posts = contentPosts || []
    let totalViews = 0
    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0
    let totalReach = 0

    posts.forEach((post: ContentPost) => {
      if (post.metrics) {
        totalViews += post.metrics.views || 0
        totalLikes += post.metrics.likes || 0
        totalComments += post.metrics.comments || 0
        totalShares += post.metrics.shares || 0
        totalReach += post.metrics.reach || post.metrics.views || 0
      }
    })

    const totalEngagement = totalLikes + totalComments + totalShares
    const avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0

    // Get unique active influencers
    const activeInfluencerIds = new Set<string>()
    posts.forEach((post: any) => {
      const ci = campaignInfluencers?.find((c: any) => c.id === post.campaign_influencer_id)
      if (ci) {
        activeInfluencerIds.add(ci.influencer_id)
      }
    })

    // Calculate pipeline stats
    const pipelineStats: PipelineStats = {
      discovered: 0,
      contacted: 0,
      responded: 0,
      negotiating: 0,
      confirmed: 0,
      posted: 0,
      completed: 0,
      conversion_rates: {
        discovered_to_contacted: 0,
        contacted_to_responded: 0,
        responded_to_confirmed: 0,
        confirmed_to_posted: 0,
      },
    }

    // Map database stages to funnel stages
    const stageMapping: Record<PipelineStage, keyof PipelineStats> = {
      discovered: 'discovered',
      researching: 'discovered',
      outreach_pending: 'discovered',
      contacted: 'contacted',
      in_negotiation: 'negotiating',
      deal_signed: 'confirmed',
      content_in_progress: 'confirmed',
      content_posted: 'posted',
      completed: 'completed',
      declined: 'discovered',
      unresponsive: 'contacted',
    }

    ;(campaignInfluencers || []).forEach((ci: any) => {
      const mappedStage = stageMapping[ci.stage as PipelineStage] || 'discovered'
      if (mappedStage in pipelineStats && typeof pipelineStats[mappedStage] === 'number') {
        (pipelineStats[mappedStage as keyof Omit<PipelineStats, 'conversion_rates'>] as number)++
      }
    })

    // Calculate responded (anyone past contacted)
    pipelineStats.responded = pipelineStats.negotiating + pipelineStats.confirmed + pipelineStats.posted + pipelineStats.completed

    // Calculate conversion rates
    pipelineStats.conversion_rates = {
      discovered_to_contacted: calculateConversionRate(
        pipelineStats.discovered + pipelineStats.contacted + pipelineStats.responded,
        pipelineStats.contacted + pipelineStats.responded
      ),
      contacted_to_responded: calculateConversionRate(
        pipelineStats.contacted + pipelineStats.responded,
        pipelineStats.responded
      ),
      responded_to_confirmed: calculateConversionRate(
        pipelineStats.responded,
        pipelineStats.confirmed + pipelineStats.posted + pipelineStats.completed
      ),
      confirmed_to_posted: calculateConversionRate(
        pipelineStats.confirmed + pipelineStats.posted + pipelineStats.completed,
        pipelineStats.posted + pipelineStats.completed
      ),
    }

    // Generate timeline data (group by day)
    const timelineMap = new Map<string, TimelineDataPoint>()

    // Initialize all days in range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0]
      timelineMap.set(dateKey, {
        date: dateKey,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        engagement: 0,
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Aggregate post metrics by day
    posts.forEach((post: ContentPost) => {
      if (post.posted_at && post.metrics) {
        const dateKey = post.posted_at.split('T')[0]
        const existing = timelineMap.get(dateKey)
        if (existing) {
          existing.views += post.metrics.views || 0
          existing.likes += post.metrics.likes || 0
          existing.comments += post.metrics.comments || 0
          existing.shares += post.metrics.shares || 0
          existing.reach += post.metrics.reach || post.metrics.views || 0
          existing.engagement += (post.metrics.likes || 0) + (post.metrics.comments || 0) + (post.metrics.shares || 0)
        }
      }
    })

    const timeline = Array.from(timelineMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Get top content
    const topContent: TopContent[] = posts
      .filter((post: ContentPost) => post.metrics && (post.metrics.views || 0) > 0)
      .sort((a: ContentPost, b: ContentPost) => {
        const aEngagement = ((a.metrics?.likes || 0) + (a.metrics?.comments || 0) + (a.metrics?.shares || 0))
        const bEngagement = ((b.metrics?.likes || 0) + (b.metrics?.comments || 0) + (b.metrics?.shares || 0))
        return bEngagement - aEngagement
      })
      .slice(0, 10)
      .map((post: ContentPost) => {
        const ci = campaignInfluencers?.find((c: any) => c.id === post.campaign_influencer_id)
        return {
          id: post.id,
          title: post.caption || `${post.post_type} on ${post.platform}`,
          platform: post.platform,
          post_type: post.post_type,
          post_url: post.post_url,
          posted_at: post.posted_at || post.created_at,
          metrics: post.metrics || {},
          influencer: ci?.influencers ? {
            id: ci.influencers.id,
            username: ci.influencers.username,
            display_name: ci.influencers.display_name,
            avatar_url: ci.influencers.avatar_url,
          } : {
            id: '',
            username: 'Unknown',
            display_name: 'Unknown',
            avatar_url: null,
          },
        }
      })

    // Aggregate influencer performance
    const influencerMetrics = new Map<string, {
      influencer: any
      total_views: number
      total_engagement: number
      posts_count: number
    }>()

    posts.forEach((post: ContentPost) => {
      const ci = campaignInfluencers?.find((c: any) => c.id === post.campaign_influencer_id)
      if (ci && ci.influencers) {
        const existing = influencerMetrics.get(ci.influencer_id) || {
          influencer: ci.influencers,
          total_views: 0,
          total_engagement: 0,
          posts_count: 0,
        }

        existing.total_views += post.metrics?.views || 0
        existing.total_engagement += (post.metrics?.likes || 0) + (post.metrics?.comments || 0) + (post.metrics?.shares || 0)
        existing.posts_count += 1

        influencerMetrics.set(ci.influencer_id, existing)
      }
    })

    const topInfluencers: TopInfluencer[] = Array.from(influencerMetrics.values())
      .sort((a, b) => b.total_engagement - a.total_engagement)
      .slice(0, 10)
      .map((data) => ({
        influencer: {
          id: data.influencer.id,
          username: data.influencer.username,
          display_name: data.influencer.display_name,
          avatar_url: data.influencer.avatar_url,
          platform: data.influencer.platform,
        },
        total_views: data.total_views,
        total_engagement: data.total_engagement,
        posts_count: data.posts_count,
        avg_engagement_rate: data.total_views > 0
          ? (data.total_engagement / data.total_views) * 100
          : 0,
      }))

    // Build summary
    const summary: AnalyticsSummary = {
      total_reach: totalReach,
      total_engagement: totalEngagement,
      total_posts: posts.length,
      active_influencers: activeInfluencerIds.size,
      avg_engagement_rate: avgEngagementRate,
      total_views: totalViews,
      total_likes: totalLikes,
      total_comments: totalComments,
      total_shares: totalShares,
    }

    // Calculate trends (compare to previous period)
    // For now, use mock trend data - in production, query previous period
    const trends: AnalyticsTrends = {
      reach_change: Math.random() * 40 - 10, // -10% to +30%
      engagement_change: Math.random() * 40 - 10,
      posts_change: Math.random() * 40 - 10,
      influencers_change: Math.random() * 40 - 10,
    }

    const analyticsData: AnalyticsData = {
      summary,
      trends,
      timeline,
      top_content: topContent,
      top_influencers: topInfluencers,
      pipeline_stats: pipelineStats,
    }

    return NextResponse.json<ApiResponse<AnalyticsData>>({
      data: analyticsData,
      error: null,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/analytics:', error)
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
