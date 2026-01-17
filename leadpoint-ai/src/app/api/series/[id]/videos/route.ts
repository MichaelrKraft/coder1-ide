import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getSeriesVideos,
  addVideoToSeries,
  updateVideo,
  deleteVideo,
  canAccessSeries,
} from '@/lib/series/series-service'
import type { SeriesVideo } from '@/types/database'
import type { ApiResponse } from '@/types/api'

/**
 * GET /api/series/[id]/videos
 * List all videos for a series
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
            message: 'You must be logged in to view videos',
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

    const videos = await getSeriesVideos(seriesId)

    return NextResponse.json<ApiResponse<SeriesVideo[]>>({
      data: videos,
      error: null,
    })
  } catch (error) {
    console.error('[Videos] GET error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch videos',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/series/[id]/videos
 * Add a video to a series
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
            message: 'You must be logged in to add videos',
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
    if (!body.videoUrl || typeof body.videoUrl !== 'string') {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Video URL is required',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    // Validate variation type if provided
    if (body.variationType) {
      const validTypes = ['original', 'iteration', 'trend_adaptation', 'cross_promote']
      if (!validTypes.includes(body.variationType)) {
        return NextResponse.json<ApiResponse<null>>(
          {
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid variation type. Must be one of: ${validTypes.join(', ')}`,
              status: 400,
            },
          },
          { status: 400 }
        )
      }
    }

    // Validate numeric fields
    if (body.views !== undefined && (typeof body.views !== 'number' || body.views < 0)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Views must be a non-negative number',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    const video = await addVideoToSeries({
      seriesId,
      videoUrl: body.videoUrl.trim(),
      videoId: body.videoId?.trim(),
      title: body.title?.trim(),
      views: body.views,
      likes: body.likes,
      comments: body.comments,
      shares: body.shares,
      postedAt: body.postedAt,
      variationType: body.variationType,
    })

    return NextResponse.json<ApiResponse<SeriesVideo>>(
      {
        data: video,
        error: null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Videos] POST error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to add video',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/series/[id]/videos
 * Update a video's details
 * Body: { videoId: string, ...updates }
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
            message: 'You must be logged in to update videos',
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
    if (!body.videoId || typeof body.videoId !== 'string') {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Video ID is required',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    // Validate variation type if provided
    if (body.variationType) {
      const validTypes = ['original', 'iteration', 'trend_adaptation', 'cross_promote']
      if (!validTypes.includes(body.variationType)) {
        return NextResponse.json<ApiResponse<null>>(
          {
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid variation type. Must be one of: ${validTypes.join(', ')}`,
              status: 400,
            },
          },
          { status: 400 }
        )
      }
    }

    const video = await updateVideo(body.videoId, {
      title: body.title?.trim(),
      views: body.views,
      likes: body.likes,
      comments: body.comments,
      shares: body.shares,
      postedAt: body.postedAt,
      variationType: body.variationType,
    })

    return NextResponse.json<ApiResponse<SeriesVideo>>({
      data: video,
      error: null,
    })
  } catch (error) {
    console.error('[Videos] PATCH error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update video',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/series/[id]/videos
 * Delete a video from a series
 * Body: { videoId: string }
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
            message: 'You must be logged in to delete videos',
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
    if (!body.videoId || typeof body.videoId !== 'string') {
      return NextResponse.json<ApiResponse<null>>(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Video ID is required',
            status: 400,
          },
        },
        { status: 400 }
      )
    }

    await deleteVideo(body.videoId)

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      data: { deleted: true },
      error: null,
    })
  } catch (error) {
    console.error('[Videos] DELETE error:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete video',
          status: 500,
        },
      },
      { status: 500 }
    )
  }
}
