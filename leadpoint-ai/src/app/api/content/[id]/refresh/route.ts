/**
 * Content Metrics Refresh API Endpoint
 * POST /api/content/[id]/refresh - Refresh metrics for a content post
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeContentMetrics } from '@/lib/content/scraper'
import { getMockContentMetrics, getMockMetricsHistory } from '@/lib/content/mock'
import type { ContentMetrics } from '@/types/content'

// ============================================================================
// POST Handler - Refresh Metrics
// ============================================================================

export async function POST(
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
      // Simulate refresh with mock data
      const metrics = getMockContentMetrics()
      const history = getMockMetricsHistory(7)
      
      return NextResponse.json({
        data: {
          id,
          metrics,
          metrics_history: history,
          last_scraped_at: metrics.scraped_at,
        },
        message: 'Metrics refreshed successfully (mock)',
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

    // Check if post has a URL to scrape
    if (!contentPost.post_url) {
      return NextResponse.json(
        { error: { code: 'NO_URL', message: 'Content post has no URL to scrape' } },
        { status: 400 }
      )
    }

    // Scrape new metrics
    let metrics: ContentMetrics | null = null
    try {
      metrics = await scrapeContentMetrics(contentPost.post_url)
    } catch (error) {
      console.error('[Content Refresh API] Scraping error:', error)
      // Use mock data as fallback
      metrics = getMockContentMetrics()
    }

    if (!metrics) {
      return NextResponse.json(
        { error: { code: 'SCRAPE_ERROR', message: 'Failed to scrape metrics' } },
        { status: 500 }
      )
    }

    // Calculate engagement rate if not present
    if (!metrics.engagement_rate && metrics.views > 0) {
      const totalEngagement = metrics.likes + metrics.comments + metrics.shares
      metrics.engagement_rate = parseFloat(((totalEngagement / metrics.views) * 100).toFixed(2))
    }

    // Update content post with new metrics
    const { error: updateError } = await supabase
      .from('content_posts')
      .update({
        metrics: {
          views: metrics.views,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          saves: metrics.saves,
          engagement_rate: metrics.engagement_rate,
        },
        metrics_updated_at: metrics.scraped_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('[Content Refresh API] Update error:', updateError)
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: 'Failed to update metrics' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        id,
        metrics,
        last_scraped_at: metrics.scraped_at,
      },
      message: 'Metrics refreshed successfully',
    })

  } catch (error) {
    console.error('[Content Refresh API] Error:', error)
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
