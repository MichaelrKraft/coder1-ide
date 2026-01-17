import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getSeriesAnalysis,
  calculateSeriesHealth,
  updateSeries,
  deleteSeries,
  canAccessSeries,
  canDeleteSeries,
} from '@/lib/series/series-service'
import type { ViralSeries, SeriesVideo, SeriesVariation } from '@/types/database'
import type { ApiResponse } from '@/types/api'

interface SeriesAnalysisResponse {
  series: ViralSeries
  videos: SeriesVideo[]
  topPerformer: SeriesVideo | null
  performanceTrend: 'improving' | 'declining' | 'stable'
  suggestedVariations: SeriesVariation[]
  healthScore: number
  healthStatus: 'thriving' | 'stable' | 'needs_attention' | 'declining'
  recommendations: string[]
}

/**
 * GET /api/series/[id]
 * Get series detail with analysis
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
            message: 'You must be logged in to view series',
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

    const health = calculateSeriesHealth(analysis.videos)

    return NextResponse.json<ApiResponse<SeriesAnalysisResponse>>({
      data: {
        ...analysis,
        healthScore: health.healthScore,
        healthStatus: health.status,
        recommendations: health.recommendations,
      },
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
 * PATCH /api/series/[id]
 * Update a series
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
            message: 'You must be logged in to update series',
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

    // Validate format type if provided
    if (body.formatType) {
      const validFormatTypes = ['educational', 'storytelling', 'trend', 'challenge', 'review', 'transformation', 'other']
      if (!validFormatTypes.includes(body.formatType)) {
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
    }

    // Validate status if provided
    if (body.status) {
      const validStatuses = ['active', 'paused', 'completed']
      if (!validStatuses.includes(body.status)) {
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
    }

    // Validate trend direction if provided
    if (body.trendDirection) {
      const validTrends = ['growing', 'stable', 'declining']
      if (!validTrends.includes(body.trendDirection)) {
        return NextResponse.json<ApiResponse<null>>(
          {
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid trend direction. Must be one of: ${validTrends.join(', ')}`,
              status: 400,
            },
          },
          { status: 400 }
        )
      }
    }

    const series = await updateSeries(seriesId, {
      name: body.name?.trim(),
      description: body.description?.trim(),
      hookPattern: body.hookPattern?.trim(),
      formatType: body.formatType,
      status: body.status,
      trendDirection: body.trendDirection,
    })

    return NextResponse.json<ApiResponse<ViralSeries>>({
      data: series,
      error: null,
    })
  } catch (error) {
    console.error('[Series] PATCH error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update series',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/series/[id]
 * Delete a series (owner/admin only)
 */
export async function DELETE(
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
            message: 'You must be logged in to delete series',
            status: 401,
          },
        },
        { status: 401 }
      )
    }

    // Check delete permission (owner/admin only)
    const canDelete = await canDeleteSeries(seriesId)
    if (!canDelete) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners and admins can delete series',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    await deleteSeries(seriesId)

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      data: { deleted: true },
      error: null,
    })
  } catch (error) {
    console.error('[Series] DELETE error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete series',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}
