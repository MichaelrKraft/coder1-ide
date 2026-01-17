import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getSeriesAnalysis,
  generateSeriesVariations,
  getSeriesVariations,
  updateVariation,
  canAccessSeries,
} from '@/lib/series/series-service'
import {
  validateCreditsForOperation,
  deductCredits,
} from '@/lib/credits'
import type { SeriesVariation } from '@/types/database'
import type { ApiResponse } from '@/types/api'

/**
 * GET /api/series/[id]/variations
 * Get all variations for a series
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seriesId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to view variations',
            status: 401,
          },
        },
        { status: 401 }
      )
    }

    // Check series access
    const hasAccess = await canAccessSeries(seriesId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this series',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    // Parse query params for optional status filter
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as SeriesVariation['status'] | null

    const variations = await getSeriesVariations(seriesId, status || undefined)

    return NextResponse.json<ApiResponse<SeriesVariation[]>>({
      data: variations,
      error: null,
    })
  } catch (error) {
    console.error('[Variations] GET error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch variations',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/series/[id]/variations
 * Generate new AI variations for a series (saves to DB)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seriesId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to generate variations',
            status: 401,
          },
        },
        { status: 401 }
      )
    }

    // Get series with campaign -> organization relationship for access check and credits
    const { data: series } = await supabase
      .from('viral_series')
      .select(`
        id,
        campaigns!inner (
          organization_id
        )
      `)
      .eq('id', seriesId)
      .single()

    if (!series) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Series not found',
            status: 404,
          },
        },
        { status: 404 }
      )
    }

    // Extract organization_id from nested campaigns relation
    const campaigns = series.campaigns as unknown
    const organizationId = Array.isArray(campaigns)
      ? (campaigns[0] as { organization_id: string })?.organization_id
      : (campaigns as { organization_id: string })?.organization_id

    if (!organizationId) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Could not determine organization for series',
            status: 500,
          },
        },
        { status: 500 }
      )
    }

    // Verify user is member of organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!membership) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this series',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const count = Math.min(Math.max(body.count || 5, 1), 10) // Clamp between 1-10

    // Check credit balance before proceeding
    // Each variation costs credits, so we check for the requested count
    const creditCheck = await validateCreditsForOperation(
      organizationId,
      'series_variation',
      count
    )
    if (!creditCheck.allowed && creditCheck.errorResponse) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: creditCheck.errorResponse.code,
            message: creditCheck.errorResponse.message,
            status: creditCheck.errorResponse.status,
            details: creditCheck.errorResponse.details,
          },
        },
        { status: creditCheck.errorResponse.status }
      )
    }

    const analysis = await getSeriesAnalysis(seriesId)

    if (!analysis) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Series not found',
            status: 404,
          },
        },
        { status: 404 }
      )
    }

    // Generate and save variations
    const variations = await generateSeriesVariations(analysis.series, analysis.videos, count)

    // Deduct credits AFTER successful generation
    // Deduct for the number of variations actually generated
    if (variations.length > 0) {
      const deductResult = await deductCredits(
        organizationId,
        'series_variation',
        variations.length
      )
      if (!deductResult.success) {
        console.warn(
          '[Variations] Failed to deduct credits, but variations were generated:',
          deductResult.error
        )
        // Don't fail the request - the operation succeeded, just log the issue
      }
    }

    return NextResponse.json<ApiResponse<SeriesVariation[]>>({
      data: variations,
      error: null,
    })
  } catch (error) {
    console.error('[Variations] POST error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate variations',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/series/[id]/variations
 * Update a variation's status
 * Body: { variationId: string, status: 'suggested' | 'approved' | 'in_production' | 'published' | 'rejected' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seriesId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to update variations',
            status: 401,
          },
        },
        { status: 401 }
      )
    }

    // Check series access
    const hasAccess = await canAccessSeries(seriesId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this series',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.variationId || typeof body.variationId !== 'string') {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Variation ID is required',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['suggested', 'approved', 'in_production', 'published', 'rejected']
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    const variation = await updateVariation(body.variationId, body.status)

    return NextResponse.json<ApiResponse<SeriesVariation>>({
      data: variation,
      error: null,
    })
  } catch (error) {
    console.error('[Variations] PATCH error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update variation',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}
