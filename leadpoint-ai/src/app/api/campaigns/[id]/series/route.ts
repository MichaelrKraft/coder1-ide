import { NextRequest, NextResponse } from 'next/server'
import { createClient, isDevMode } from '@/lib/supabase/server'
import {
  getCampaignSeries,
  createSeries,
  canAccessCampaign,
} from '@/lib/series/series-service'
import type { ViralSeries } from '@/types/database'
import type { ApiResponse } from '@/types/api'

// Mock series for dev mode
const mockSeries: ViralSeries[] = [
  {
    id: 'series-1',
    campaign_id: 'mock-1',
    name: 'Summer Fitness Challenge',
    description: 'A 7-day fitness challenge series',
    hook_template: 'Day {day}: {title}',
    cta_template: 'Join the challenge! Link in bio.',
    target_duration_seconds: 60,
    posting_frequency: 'daily',
    total_videos: 7,
    status: 'active',
    created_by: 'mock-user',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

/**
 * GET /api/campaigns/[id]/series
 * List all series for a campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    // Dev mode - return mock data
    if (isDevMode()) {
      return NextResponse.json<ApiResponse<ViralSeries[]>>({
        data: mockSeries.filter(s => s.campaign_id === campaignId || campaignId === 'mock-1'),
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

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to view series',
            status: 401,
          },
        },
        { status: 401 }
      )
    }

    // Check campaign access
    const hasAccess = await canAccessCampaign(campaignId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this campaign',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    const series = await getCampaignSeries(campaignId)

    return NextResponse.json<ApiResponse<ViralSeries[]>>({
      data: series,
      error: null,
    })
  } catch (error) {
    console.error('[Series] GET error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch series',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/campaigns/[id]/series
 * Create a new series for a campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to create a series',
            status: 401,
          },
        },
        { status: 401 }
      )
    }

    // Check campaign access
    const hasAccess = await canAccessCampaign(campaignId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this campaign',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Series name is required',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    if (!body.influencerId || typeof body.influencerId !== 'string') {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Influencer ID is required',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    // Validate format type
    const validFormatTypes = ['educational', 'storytelling', 'trend', 'challenge', 'review', 'transformation', 'other']
    const formatType = body.formatType || 'other'
    if (!validFormatTypes.includes(formatType)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid format type. Must be one of: ${validFormatTypes.join(', ')}`,
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    // Create the series
    const series = await createSeries({
      campaignId,
      influencerId: body.influencerId,
      name: body.name.trim(),
      description: body.description?.trim(),
      hookPattern: body.hookPattern?.trim(),
      formatType,
    })

    return NextResponse.json<ApiResponse<ViralSeries>>(
      {
        data: series,
        error: null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Series] POST error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create series',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}
