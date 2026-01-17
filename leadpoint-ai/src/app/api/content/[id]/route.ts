/**
 * Single Content Post API Endpoint
 * GET /api/content/[id] - Get single content post with full metrics
 * PATCH /api/content/[id] - Update content post
 * DELETE /api/content/[id] - Remove content post
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMockContentPosts } from '@/lib/content/mock'
import type { ContentPost, UpdateContentRequest } from '@/types/content'

// ============================================================================
// GET Handler - Get Single Content Post
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if using mock data
    const useMockData = process.env.USE_MOCK_DATA === 'true' || !process.env.SUPABASE_URL

    if (useMockData) {
      // Return mock data
      const mockPosts = getMockContentPosts('mock_campaign', 15)
      const post = mockPosts.find(p => p.id === id) || mockPosts[0]
      
      return NextResponse.json({
        data: { ...post, id },
      })
    }

    // Get content post from database
    const { data: contentPost, error: queryError } = await supabase
      .from('content_posts')
      .select(`
        *,
        campaign_influencers (
          campaign_id,
          influencer_id,
          campaigns (
            organization_id
          ),
          influencers (
            id,
            username,
            display_name,
            avatar_url,
            platform
          )
        )
      `)
      .eq('id', id)
      .single()

    if (queryError || !contentPost) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Content post not found' } },
        { status: 404 }
      )
    }

    // Verify user has access to this content (same organization)
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member || member.organization_id !== contentPost.campaign_influencers?.campaigns?.organization_id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Transform to ContentPost type
    const post: ContentPost = {
      id: contentPost.id,
      campaign_id: contentPost.campaign_influencers?.campaign_id,
      influencer_id: contentPost.campaign_influencers?.influencer_id,
      influencer: contentPost.campaign_influencers?.influencers ? {
        id: contentPost.campaign_influencers.influencers.id,
        username: contentPost.campaign_influencers.influencers.username,
        display_name: contentPost.campaign_influencers.influencers.display_name,
        avatar_url: contentPost.campaign_influencers.influencers.avatar_url,
        platform: contentPost.campaign_influencers.influencers.platform,
      } : undefined,
      post_url: contentPost.post_url,
      post_type: contentPost.post_type,
      platform: contentPost.platform,
      status: contentPost.status,
      actual_publish_date: contentPost.posted_at,
      views: contentPost.metrics?.views,
      likes: contentPost.metrics?.likes,
      comments: contentPost.metrics?.comments,
      shares: contentPost.metrics?.shares,
      saves: contentPost.metrics?.saves,
      engagement_rate: contentPost.metrics?.engagement_rate,
      last_scraped_at: contentPost.metrics_updated_at,
      thumbnail_url: contentPost.media_urls?.[0],
      caption: contentPost.caption,
      created_at: contentPost.created_at,
      updated_at: contentPost.updated_at,
    }

    return NextResponse.json({ data: post })

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
// PATCH Handler - Update Content Post
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const body: UpdateContentRequest = await request.json()

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if using mock data
    const useMockData = process.env.USE_MOCK_DATA === 'true' || !process.env.SUPABASE_URL

    if (useMockData) {
      const mockPosts = getMockContentPosts('mock_campaign', 15)
      const post = mockPosts.find(p => p.id === id) || mockPosts[0]
      
      const updatedPost: ContentPost = {
        ...post,
        id,
        status: body.status || post.status,
        notes: body.notes ?? post.notes,
        views: body.views ?? post.views,
        likes: body.likes ?? post.likes,
        comments: body.comments ?? post.comments,
        shares: body.shares ?? post.shares,
        saves: body.saves ?? post.saves,
        updated_at: new Date().toISOString(),
      }
      
      return NextResponse.json({
        data: updatedPost,
        message: 'Content post updated successfully (mock)',
      })
    }

    // Get content post and verify access
    const { data: contentPost } = await supabase
      .from('content_posts')
      .select(`
        *,
        campaign_influencers (
          campaigns (
            organization_id
          )
        )
      `)
      .eq('id', id)
      .single()

    if (!contentPost) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Content post not found' } },
        { status: 404 }
      )
    }

    // Verify access
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member || member.organization_id !== contentPost.campaign_influencers?.campaigns?.organization_id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.status) {
      updates.status = body.status
      if (body.status === 'published' && !contentPost.posted_at) {
        updates.posted_at = new Date().toISOString()
      }
    }

    // Handle manual metric updates
    if (body.views !== undefined || body.likes !== undefined || 
        body.comments !== undefined || body.shares !== undefined || body.saves !== undefined) {
      const currentMetrics = contentPost.metrics || {}
      updates.metrics = {
        ...currentMetrics,
        ...(body.views !== undefined && { views: body.views }),
        ...(body.likes !== undefined && { likes: body.likes }),
        ...(body.comments !== undefined && { comments: body.comments }),
        ...(body.shares !== undefined && { shares: body.shares }),
        ...(body.saves !== undefined && { saves: body.saves }),
      }
      updates.metrics_updated_at = new Date().toISOString()
    }

    // Update in database
    const { data: updatedPost, error: updateError } = await supabase
      .from('content_posts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('[Content API] Update error:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: 'Failed to update content post' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updatedPost,
      message: 'Content post updated successfully',
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
// DELETE Handler - Remove Content Post
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if using mock data
    const useMockData = process.env.USE_MOCK_DATA === 'true' || !process.env.SUPABASE_URL

    if (useMockData) {
      return NextResponse.json({
        message: 'Content post deleted successfully (mock)',
      })
    }

    // Get content post and verify access
    const { data: contentPost } = await supabase
      .from('content_posts')
      .select(`
        *,
        campaign_influencers (
          campaigns (
            organization_id
          )
        )
      `)
      .eq('id', id)
      .single()

    if (!contentPost) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Content post not found' } },
        { status: 404 }
      )
    }

    // Verify access
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member || member.organization_id !== contentPost.campaign_influencers?.campaigns?.organization_id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('content_posts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[Content API] Delete error:', deleteError)
      return NextResponse.json(
        { error: { code: 'DELETE_ERROR', message: 'Failed to delete content post' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Content post deleted successfully',
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
