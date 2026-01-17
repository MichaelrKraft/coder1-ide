/**
 * Content Posts API Endpoint
 * GET /api/content - List content posts with filters
 * POST /api/content - Add new content post
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, isDevMode } from '@/lib/supabase/server'
import { scrapeContentMetrics, parsePostUrl } from '@/lib/content/scraper'
import { getMockContentPosts, calculateContentStats } from '@/lib/content/mock'
import type { ContentPost, CreateContentRequest, ContentFilters, ContentListResponse } from '@/types/content'

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const VALID_SORT_FIELDS = [
  'created_at',
  'views',
  'likes',
  'engagement_rate',
  'actual_publish_date',
]

// ============================================================================
// GET Handler - List Content Posts
// ============================================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<ContentListResponse | { error: { code: string; message: string } }>> {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const campaignId = searchParams.get('campaign_id')
    const influencerId = searchParams.get('influencer_id')
    const status = searchParams.get('status') as ContentFilters['status']
    const postType = searchParams.get('post_type') as ContentFilters['post_type']
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10)
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10),
      MAX_LIMIT
    )
    const sort = searchParams.get('sort') || 'created_at'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

    // Validate sort field
    if (!VALID_SORT_FIELDS.includes(sort)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_SORT',
            message: `Invalid sort field. Valid options: ${VALID_SORT_FIELDS.join(', ')}`,
          },
        },
        { status: 400 }
      )
    }

    // Check if using mock data (dev mode - no Supabase configured)
    if (isDevMode()) {
      // Return mock data
      const mockPosts = getMockContentPosts(campaignId || 'mock_campaign', 15)
      
      // Apply filters to mock data
      let filteredPosts = mockPosts
      if (status) {
        filteredPosts = filteredPosts.filter(p => p.status === status)
      }
      if (postType) {
        filteredPosts = filteredPosts.filter(p => p.post_type === postType)
      }

      // Sort mock data
      filteredPosts.sort((a, b) => {
        const aVal = a[sort as keyof ContentPost] || 0
        const bVal = b[sort as keyof ContentPost] || 0
        if (order === 'asc') {
          return aVal > bVal ? 1 : -1
        }
        return aVal < bVal ? 1 : -1
      })

      // Paginate
      const startIndex = (page - 1) * limit
      const paginatedPosts = filteredPosts.slice(startIndex, startIndex + limit)
      const stats = calculateContentStats(filteredPosts)

      return NextResponse.json({
        data: paginatedPosts,
        pagination: {
          page,
          limit,
          total: filteredPosts.length,
          totalPages: Math.ceil(filteredPosts.length / limit),
        },
        stats,
      })
    }

    // Get authenticated user (production mode)
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Database service not available' } },
        { status: 503 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User is not a member of any organization' } },
        { status: 403 }
      )
    }

    // Build real database query
    let query = supabase
      .from('content_posts')
      .select(`
        *,
        campaign_influencers!inner (
          campaign_id,
          influencer_id,
          influencers (
            id,
            username,
            display_name,
            avatar_url,
            platform
          )
        )
      `, { count: 'exact' })

    // Filter by campaign
    if (campaignId) {
      query = query.eq('campaign_influencers.campaign_id', campaignId)
    }

    // Filter by influencer
    if (influencerId) {
      query = query.eq('campaign_influencers.influencer_id', influencerId)
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Filter by post type
    if (postType) {
      query = query.eq('post_type', postType)
    }

    // Filter by date range
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' })

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: contentPosts, error: queryError, count } = await query

    if (queryError) {
      console.error('[Content API] Query error:', queryError)
      return NextResponse.json(
        {
          error: {
            code: 'QUERY_ERROR',
            message: 'Failed to fetch content posts',
          },
        },
        { status: 500 }
      )
    }

    // Transform data to include influencer info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts: ContentPost[] = (contentPosts || []).map((post: any) => ({
      id: post.id,
      campaign_id: post.campaign_influencers?.campaign_id,
      influencer_id: post.campaign_influencers?.influencer_id,
      influencer: post.campaign_influencers?.influencers ? {
        id: post.campaign_influencers.influencers.id,
        username: post.campaign_influencers.influencers.username,
        display_name: post.campaign_influencers.influencers.display_name,
        avatar_url: post.campaign_influencers.influencers.avatar_url,
        platform: post.campaign_influencers.influencers.platform,
      } : undefined,
      post_url: post.post_url,
      post_type: post.post_type,
      platform: post.platform,
      status: post.status,
      expected_publish_date: post.expected_publish_date,
      actual_publish_date: post.posted_at,
      views: post.metrics?.views,
      likes: post.metrics?.likes,
      comments: post.metrics?.comments,
      shares: post.metrics?.shares,
      saves: post.metrics?.saves,
      engagement_rate: post.metrics?.engagement_rate,
      last_scraped_at: post.metrics_updated_at,
      thumbnail_url: post.media_urls?.[0],
      caption: post.caption,
      hashtags: [], // Would need separate query
      notes: undefined, // Would need separate storage
      created_at: post.created_at,
      updated_at: post.updated_at,
    }))

    const total = count || 0
    const stats = calculateContentStats(posts)

    return NextResponse.json({
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    })

  } catch (error) {
    console.error('[Content API] Error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST Handler - Create Content Post
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body: CreateContentRequest = await request.json()

    // Validate required fields
    if (!body.campaign_id || !body.influencer_id || !body.post_url || !body.post_type) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: campaign_id, influencer_id, post_url, post_type',
          },
        },
        { status: 400 }
      )
    }

    // Validate URL
    const parsedUrl = parsePostUrl(body.post_url)
    if (!parsedUrl.isValid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_URL',
            message: parsedUrl.error || 'Invalid post URL',
          },
        },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User is not a member of any organization' } },
        { status: 403 }
      )
    }

    // Check if using mock data
    const useMockData = process.env.USE_MOCK_DATA === 'true' || !process.env.SUPABASE_URL

    if (useMockData) {
      // Scrape metrics if URL is valid
      let metrics = null
      if (parsedUrl.isValid) {
        metrics = await scrapeContentMetrics(body.post_url)
      }

      const mockPost: ContentPost = {
        id: `content_${Date.now()}`,
        campaign_id: body.campaign_id,
        influencer_id: body.influencer_id,
        post_url: body.post_url,
        post_type: body.post_type,
        platform: parsedUrl.platform,
        status: body.expected_publish_date ? 'scheduled' : 'published',
        expected_publish_date: body.expected_publish_date,
        actual_publish_date: body.expected_publish_date ? undefined : new Date().toISOString(),
        views: metrics?.views,
        likes: metrics?.likes,
        comments: metrics?.comments,
        shares: metrics?.shares,
        saves: metrics?.saves,
        engagement_rate: metrics?.engagement_rate,
        last_scraped_at: metrics?.scraped_at,
        notes: body.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return NextResponse.json({
        data: mockPost,
        message: 'Content post created successfully (mock)',
      })
    }

    // Verify campaign exists and belongs to user's organization
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', body.campaign_id)
      .eq('organization_id', member.organization_id)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found or access denied' } },
        { status: 404 }
      )
    }

    // Find or create campaign_influencer link
    let { data: campaignInfluencer } = await supabase
      .from('campaign_influencers')
      .select('id')
      .eq('campaign_id', body.campaign_id)
      .eq('influencer_id', body.influencer_id)
      .single()

    if (!campaignInfluencer) {
      // Create the link
      const { data: newLink, error: linkError } = await supabase
        .from('campaign_influencers')
        .insert({
          campaign_id: body.campaign_id,
          influencer_id: body.influencer_id,
          stage: 'content_in_progress',
          added_by: user.id,
          stage_changed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (linkError) {
        return NextResponse.json(
          { error: { code: 'LINK_ERROR', message: 'Failed to link influencer to campaign' } },
          { status: 500 }
        )
      }
      campaignInfluencer = newLink
    }

    // Try to scrape metrics
    let metrics = null
    if (parsedUrl.isValid) {
      try {
        metrics = await scrapeContentMetrics(body.post_url)
      } catch {
        console.log('[Content API] Metrics scraping failed, continuing without metrics')
      }
    }

    // Create content post
    const { data: contentPost, error: insertError } = await supabase
      .from('content_posts')
      .insert({
        campaign_influencer_id: campaignInfluencer.id,
        platform: parsedUrl.platform,
        post_type: body.post_type,
        post_url: body.post_url,
        post_id: parsedUrl.postId,
        status: body.expected_publish_date ? 'scheduled' : 'published',
        posted_at: body.expected_publish_date ? null : new Date().toISOString(),
        metrics: metrics ? {
          views: metrics.views,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          saves: metrics.saves,
          engagement_rate: metrics.engagement_rate,
        } : null,
        metrics_updated_at: metrics ? metrics.scraped_at : null,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('[Content API] Insert error:', insertError)
      return NextResponse.json(
        { error: { code: 'INSERT_ERROR', message: 'Failed to create content post' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: contentPost,
      message: 'Content post created successfully',
    })

  } catch (error) {
    console.error('[Content API] Error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
