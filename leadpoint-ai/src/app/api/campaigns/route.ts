import { NextRequest, NextResponse } from 'next/server'
import { createClient, isDevMode } from '@/lib/supabase/server'
import type { Campaign } from '@/types/database'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

// Mock campaigns for dev mode
const mockCampaigns: (Campaign & { stats: { influencerCount: number; contentCount: number } })[] = [
  {
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
    stats: { influencerCount: 12, contentCount: 34 },
  },
  {
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
    stats: { influencerCount: 5, contentCount: 0 },
  },
  {
    id: 'mock-3',
    organization_id: 'mock-org',
    name: 'Tech Review Series',
    description: 'Partner with tech influencers for product reviews',
    status: 'completed',
    goals: { primary_goal: 'conversions', kpis: ['clicks', 'sales'] },
    target_audience: { interests: ['technology', 'gadgets', 'reviews'] },
    budget_range: { min: 10000, max: 25000, currency: 'USD' },
    start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'mock-user',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    stats: { influencerCount: 8, contentCount: 24 },
  },
]

// GET - List all campaigns for the user's organization
export async function GET(request: NextRequest) {
  try {
    // Dev mode - return mock data
    if (isDevMode()) {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1', 10)
      const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
      const status = searchParams.get('status')

      let filtered = [...mockCampaigns]
      if (status && status !== 'all') {
        filtered = filtered.filter(c => c.status === status)
      }

      return NextResponse.json<PaginatedResponse<Campaign & { stats: { influencerCount: number; contentCount: number } }>>({
        data: filtered,
        pagination: {
          page,
          pageSize,
          total: filtered.length,
          totalPages: 1,
          hasMore: false,
        },
      })
    }

    const supabase = await createClient()

    // Should not happen, but handle gracefully
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
            message: 'You must be logged in to view campaigns',
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('campaigns')
      .select('*', { count: 'exact' })
      .eq('organization_id', membership.organization_id)
      .neq('status', 'archived') // Exclude archived by default

    // Apply status filter
    if (status && status !== 'all') {
      if (status === 'archived') {
        // Reset the query to include archived
        query = supabase
          .from('campaigns')
          .select('*', { count: 'exact' })
          .eq('organization_id', membership.organization_id)
          .eq('status', 'archived')
      } else {
        query = query.eq('status', status)
      }
    }

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: campaigns, error: campaignsError, count } = await query

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch campaigns',
            status: 500,
          },
        },
        { status: 500 }
      )
    }

    // Get stats for each campaign
    const campaignsWithStats = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        // Get influencer count
        const { count: influencerCount } = await supabase
          .from('campaign_influencers')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)

        // Get content count
        const { count: contentCount } = await supabase
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_influencer_id', campaign.id)

        return {
          ...campaign,
          stats: {
            influencerCount: influencerCount || 0,
            contentCount: contentCount || 0,
          },
        }
      })
    )

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json<PaginatedResponse<Campaign & { stats: { influencerCount: number; contentCount: number } }>>({
      data: campaignsWithStats,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/campaigns:', error)
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

// POST - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    // Dev mode - return mock created campaign
    if (isDevMode()) {
      const body = await request.json()
      const { name, description, target_niche, hashtags, budget, start_date, end_date, goals } = body

      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: { code: 'VALIDATION_ERROR', message: 'Campaign name is required', status: 400 } },
          { status: 400 }
        )
      }

      const newCampaign: Campaign = {
        id: `mock-${Date.now()}`,
        organization_id: 'mock-org',
        name: name.trim(),
        description: description?.trim() || null,
        status: 'draft',
        goals: goals || { primary_goal: 'brand_awareness', kpis: ['reach', 'engagement'] },
        target_audience: { interests: [target_niche, ...(hashtags || [])] },
        budget_range: budget ? { min: 0, max: budget, currency: 'USD' } : null,
        start_date: start_date || null,
        end_date: end_date || null,
        created_by: 'mock-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return NextResponse.json<ApiResponse<Campaign>>({ data: newCampaign, error: null }, { status: 201 })
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
            message: 'You must be logged in to create a campaign',
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
            message: 'You must be part of an organization to create a campaign',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      name,
      description,
      target_niche,
      hashtags,
      budget,
      start_date,
      end_date,
      goals,
    } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Campaign name is required',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    if (!target_niche || typeof target_niche !== 'string' || target_niche.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Target niche is required',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one hashtag is required',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    // Build target audience from niche and hashtags
    const targetAudience = {
      interests: [target_niche, ...hashtags],
    }

    // Build budget range if provided
    const budgetRange = budget
      ? {
          min: 0,
          max: budget,
          currency: 'USD',
        }
      : null

    // Build campaign goals
    const campaignGoals = goals || {
      primary_goal: 'brand_awareness',
      kpis: ['reach', 'engagement'],
    }

    // Create campaign
    const { data: campaign, error: createError } = await supabase
      .from('campaigns')
      .insert({
        organization_id: membership.organization_id,
        name: name.trim(),
        description: description?.trim() || null,
        status: 'draft',
        goals: campaignGoals,
        target_audience: targetAudience,
        budget_range: budgetRange,
        start_date: start_date || null,
        end_date: end_date || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating campaign:', createError)
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to create campaign',
            status: 500,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<Campaign>>(
      {
        data: campaign,
        error: null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/campaigns:', error)
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
