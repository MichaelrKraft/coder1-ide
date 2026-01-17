import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllSeries } from '@/lib/series/series-service'
import type { ViralSeries } from '@/types/database'
import type { ApiResponse } from '@/types/api'

/**
 * GET /api/series
 * List all series (with optional campaign filter)
 * Query params:
 *   - campaignId: Filter by campaign
 *   - status: Filter by series status (active, paused, completed)
 */
export async function GET(request: NextRequest) {
  try {
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
            message: 'You must be part of an organization to view series',
            status: 403,
          },
        },
        { status: 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const status = searchParams.get('status') as ViralSeries['status'] | null

    // Get all series for the user's campaigns
    // Note: getAllSeries uses RLS, so it will only return series the user has access to
    let series = await getAllSeries(campaignId || undefined)

    // Apply status filter if provided
    if (status) {
      const validStatuses = ['active', 'paused', 'completed']
      if (validStatuses.includes(status)) {
        series = series.filter(s => s.status === status)
      }
    }

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
