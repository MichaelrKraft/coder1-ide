/**
 * Influencer List API Endpoint
 * GET /api/influencers
 *
 * List influencers with filters, pagination, and sorting
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, isDevMode } from '@/lib/supabase/server'
import type { Platform, Influencer } from '@/types/database'

// Mock influencers for dev mode
const mockInfluencers: Influencer[] = [
  {
    id: 'mock-inf-1',
    organization_id: 'mock-org',
    platform: 'instagram',
    platform_id: 'ig_12345',
    username: 'fashionista_emma',
    display_name: 'Emma Thompson',
    profile_url: 'https://instagram.com/fashionista_emma',
    avatar_url: 'https://ui-avatars.com/api/?name=Emma+Thompson&background=random',
    bio: 'Fashion & Lifestyle | NYC 🗽 | Collab: dm@fashionista.com',
    follower_count: 125000,
    following_count: 890,
    engagement_rate: 4.2,
    average_likes: 5250,
    average_comments: 215,
    categories: ['fashion', 'lifestyle'],
    location: { city: 'New York', country: 'US' },
    email: 'emma@fashionista.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-inf-2',
    organization_id: 'mock-org',
    platform: 'tiktok',
    platform_id: 'tt_67890',
    username: 'techreviews_mike',
    display_name: 'Mike Chen',
    profile_url: 'https://tiktok.com/@techreviews_mike',
    avatar_url: 'https://ui-avatars.com/api/?name=Mike+Chen&background=random',
    bio: 'Tech reviews & unboxings 📱 | 500k+ happy viewers',
    follower_count: 520000,
    following_count: 320,
    engagement_rate: 6.8,
    average_likes: 35360,
    average_comments: 890,
    categories: ['technology', 'gadgets', 'reviews'],
    location: { city: 'San Francisco', country: 'US' },
    email: 'mike@techreviews.co',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-inf-3',
    organization_id: 'mock-org',
    platform: 'youtube',
    platform_id: 'yt_11223',
    username: 'fitnesswithsarah',
    display_name: 'Sarah Johnson',
    profile_url: 'https://youtube.com/@fitnesswithsarah',
    avatar_url: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=random',
    bio: 'Certified PT | Transform your body in 12 weeks | Free workout plans below 👇',
    follower_count: 890000,
    following_count: 45,
    engagement_rate: 3.1,
    average_likes: 27590,
    average_comments: 1200,
    categories: ['fitness', 'wellness', 'health'],
    location: { city: 'Los Angeles', country: 'US' },
    email: 'sarah@fitnesswithsarah.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-inf-4',
    organization_id: 'mock-org',
    platform: 'instagram',
    platform_id: 'ig_44556',
    username: 'foodie_adventures',
    display_name: 'Alex Rivera',
    profile_url: 'https://instagram.com/foodie_adventures',
    avatar_url: 'https://ui-avatars.com/api/?name=Alex+Rivera&background=random',
    bio: 'Food blogger 🍕 | Restaurant reviews | Recipe creator',
    follower_count: 78000,
    following_count: 560,
    engagement_rate: 5.5,
    average_likes: 4290,
    average_comments: 180,
    categories: ['food', 'lifestyle', 'travel'],
    location: { city: 'Chicago', country: 'US' },
    email: 'alex@foodieadventures.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// ============================================================================
// Types
// ============================================================================

interface InfluencersResponse {
  data: Influencer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const VALID_SORT_FIELDS = [
  'score',
  'follower_count',
  'engagement_rate',
  'created_at',
  'updated_at',
  'username',
  'average_likes',
  'average_comments',
]

// ============================================================================
// GET Handler - List Influencers
// ============================================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<InfluencersResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)

    // Dev mode - return mock data
    if (isDevMode()) {
      const page = parseInt(searchParams.get('page') || '1', 10)
      const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
      const search = searchParams.get('search')
      const platform = searchParams.get('platform')

      let filtered = [...mockInfluencers]
      if (platform) {
        filtered = filtered.filter(i => i.platform === platform)
      }
      if (search) {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter(i =>
          i.username.toLowerCase().includes(searchLower) ||
          i.display_name.toLowerCase().includes(searchLower)
        )
      }

      return NextResponse.json({
        data: filtered,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: 1,
        },
      })
    }

    // Parse query parameters
    const campaignId = searchParams.get('campaign_id')
    const minFollowers = parseIntParam(searchParams.get('min_followers'))
    const maxFollowers = parseIntParam(searchParams.get('max_followers'))
    const minScore = parseFloatParam(searchParams.get('min_score'))
    const minEngagement = parseFloatParam(searchParams.get('min_engagement'))
    const maxEngagement = parseFloatParam(searchParams.get('max_engagement'))
    const niche = searchParams.get('niche')
    const platform = searchParams.get('platform') as Platform | null
    const search = searchParams.get('search')
    const page = parseIntParam(searchParams.get('page')) || DEFAULT_PAGE
    const limit = Math.min(
      parseIntParam(searchParams.get('limit')) || DEFAULT_LIMIT,
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

    // Get authenticated user
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Database service is not available' } },
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
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User is not a member of any organization' } },
        { status: 403 }
      )
    }

    const organizationId = member.organization_id

    // Build query
    let query = supabase
      .from('influencers')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)

    // Filter by campaign if specified (via campaign_influencers join)
    if (campaignId) {
      // Get influencer IDs from campaign
      const { data: campaignInfluencers } = await supabase
        .from('campaign_influencers')
        .select('influencer_id')
        .eq('campaign_id', campaignId)

      if (campaignInfluencers && campaignInfluencers.length > 0) {
        const influencerIds = campaignInfluencers.map(ci => ci.influencer_id)
        query = query.in('id', influencerIds)
      } else {
        // No influencers in campaign, return empty result
        return NextResponse.json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        })
      }
    }

    // Apply filters
    if (minFollowers !== null) {
      query = query.gte('follower_count', minFollowers)
    }

    if (maxFollowers !== null) {
      query = query.lte('follower_count', maxFollowers)
    }

    if (minEngagement !== null) {
      query = query.gte('engagement_rate', minEngagement)
    }

    if (maxEngagement !== null) {
      query = query.lte('engagement_rate', maxEngagement)
    }

    if (platform) {
      const validPlatforms: Platform[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin']
      if (validPlatforms.includes(platform)) {
        query = query.eq('platform', platform)
      }
    }

    if (niche) {
      // Search in categories array
      query = query.contains('categories', [niche])
    }

    if (search) {
      // Search in username and display_name
      query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
    }

    // Handle score filter (requires joining with campaign_influencers)
    if (minScore !== null && campaignId) {
      // This would require a more complex query with the score from campaign_influencers
      // For now, we'll handle it in post-processing
    }

    // Apply sorting
    const sortColumn = sort === 'score' ? 'engagement_rate' : sort
    query = query.order(sortColumn, { ascending: order === 'asc' })

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: influencers, error: queryError, count } = await query

    if (queryError) {
      console.error('[Influencers API] Query error:', queryError)
      return NextResponse.json(
        {
          error: {
            code: 'QUERY_ERROR',
            message: 'Failed to fetch influencers',
            details: { message: queryError.message },
          },
        },
        { status: 500 }
      )
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: influencers || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })

  } catch (error) {
    console.error('[Influencers API] Error:', error)
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
// POST Handler - Bulk Create/Import Influencers
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = await request.json()

    // Validate request
    if (!body.influencers || !Array.isArray(body.influencers)) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'influencers array is required' } },
        { status: 400 }
      )
    }

    const { influencers, campaign_id } = body

    // Dev mode - return mock result
    if (isDevMode()) {
      return NextResponse.json({
        created: influencers.length,
        updated: 0,
        errors: 0,
        details: {
          created_ids: influencers.map((_: unknown, i: number) => `mock-created-${Date.now()}-${i}`),
          updated_ids: [],
          error_details: [],
        },
      })
    }

    // Get authenticated user
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Database service is not available' } },
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

    const organizationId = member.organization_id

    // Verify campaign if specified
    if (campaign_id) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('id')
        .eq('id', campaign_id)
        .eq('organization_id', organizationId)
        .single()

      if (!campaign) {
        return NextResponse.json(
          { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found or access denied' } },
          { status: 404 }
        )
      }
    }

    // Import influencers
    const created: string[] = []
    const updated: string[] = []
    const errors: { index: number; error: string }[] = []

    for (let i = 0; i < influencers.length; i++) {
      const influencer = influencers[i]

      try {
        // Validate required fields
        if (!influencer.platform || !influencer.username) {
          errors.push({ index: i, error: 'Missing required fields: platform, username' })
          continue
        }

        // Check if exists
        const { data: existing } = await supabase
          .from('influencers')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('platform', influencer.platform)
          .eq('username', influencer.username)
          .single()

        if (existing) {
          // Update
          await supabase
            .from('influencers')
            .update({
              display_name: influencer.display_name || influencer.username,
              profile_url: influencer.profile_url,
              avatar_url: influencer.avatar_url,
              bio: influencer.bio,
              follower_count: influencer.follower_count || 0,
              following_count: influencer.following_count || 0,
              engagement_rate: influencer.engagement_rate,
              categories: influencer.categories || [],
              location: influencer.location,
              email: influencer.email,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)

          updated.push(existing.id)

          // Link to campaign if specified
          if (campaign_id) {
            await linkToCampaign(supabase, campaign_id, existing.id)
          }

        } else {
          // Insert
          const { data: newInfluencer, error: insertError } = await supabase
            .from('influencers')
            .insert({
              organization_id: organizationId,
              platform: influencer.platform,
              platform_id: influencer.platform_id || `manual_${Date.now()}_${i}`,
              username: influencer.username,
              display_name: influencer.display_name || influencer.username,
              profile_url: influencer.profile_url || `https://${influencer.platform}.com/${influencer.username}`,
              avatar_url: influencer.avatar_url,
              bio: influencer.bio,
              follower_count: influencer.follower_count || 0,
              following_count: influencer.following_count || 0,
              engagement_rate: influencer.engagement_rate,
              categories: influencer.categories || [],
              location: influencer.location,
              email: influencer.email,
            })
            .select('id')
            .single()

          if (insertError) {
            errors.push({ index: i, error: insertError.message })
            continue
          }

          created.push(newInfluencer.id)

          // Link to campaign if specified
          if (campaign_id) {
            await linkToCampaign(supabase, campaign_id, newInfluencer.id)
          }
        }

      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      created: created.length,
      updated: updated.length,
      errors: errors.length,
      details: {
        created_ids: created,
        updated_ids: updated,
        error_details: errors,
      },
    })

  } catch (error) {
    console.error('[Influencers API] Import error:', error)
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
// Helper Functions
// ============================================================================

function parseIntParam(value: string | null): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? null : parsed
}

function parseFloatParam(value: string | null): number | null {
  if (!value) return null
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

async function linkToCampaign(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  influencerId: string
): Promise<void> {
  const { data: existingLink } = await supabase
    .from('campaign_influencers')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('influencer_id', influencerId)
    .single()

  if (!existingLink) {
    await supabase
      .from('campaign_influencers')
      .insert({
        campaign_id: campaignId,
        influencer_id: influencerId,
        stage: 'discovered',
        added_by: 'import',
        stage_changed_at: new Date().toISOString(),
      })
  }
}
