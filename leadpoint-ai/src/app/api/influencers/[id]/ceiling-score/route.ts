/**
 * Ceiling Score API Endpoint
 * GET /api/influencers/:id/ceiling-score - Calculate ceiling score for an influencer
 * POST /api/influencers/ceiling-score - Batch calculate ceiling scores
 *
 * Uses real data from database with 24-hour caching in ceiling_score_data table
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateCeilingScore, type CeilingScoreInput } from '@/lib/scoring/ceiling-score'
import type { CeilingScoreDataRow, Influencer } from '@/types/database'

// ============================================================================
// Constants
// ============================================================================

const CACHE_DURATION_HOURS = 24
const CACHE_DURATION_MS = CACHE_DURATION_HOURS * 60 * 60 * 1000

// ============================================================================
// Types
// ============================================================================

interface CeilingScoreResponse {
  data: {
    influencerId: string
    ceilingScore: number
    averageScore: number
    hiddenGemRating: number
    isHiddenGem: boolean
    bestVideoViews: number
    viralVideosCount: number
    consistencyScore: number
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
    insights: string[]
    analyzedVideos: number
    calculatedAt: string
    cached: boolean
  } | null
  error: string | null
}

interface VideoData {
  views: number
  likes: number
  comments: number
  postedAt?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if cached score is still valid (within 24 hours)
 */
function isCacheValid(analyzedAt: string): boolean {
  const cacheTime = new Date(analyzedAt).getTime()
  const now = Date.now()
  return (now - cacheTime) < CACHE_DURATION_MS
}

/**
 * Get grade from ceiling score
 */
function getGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

/**
 * Generate insights from cached data
 */
function generateInsightsFromCache(data: CeilingScoreDataRow): string[] {
  const insights: string[] = []

  if (data.best_video_views >= 1000000) {
    insights.push(`Hit ${formatViews(data.best_video_views)} views - Proven viral capability!`)
  } else if (data.best_video_views >= 500000) {
    insights.push(`Best video: ${formatViews(data.best_video_views)} views - Strong viral potential`)
  }

  if (data.viral_videos_count >= 3) {
    insights.push(`${data.viral_videos_count} viral videos (500K+) - Consistent viral performer`)
  } else if (data.viral_videos_count === 1) {
    insights.push(`1 viral hit - Can replicate with right content`)
  }

  if (data.hidden_gem_rating > 20) {
    insights.push(`HIDDEN GEM: Ceiling ${data.ceiling_score} vs Average ${data.average_score} - Undervalued!`)
  }

  if (data.consistency_score < 30) {
    insights.push(`Inconsistent posting - viral hits may be harder to replicate`)
  }

  return insights
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(0)}K`
  return views.toString()
}

/**
 * Get video data from content_posts for an influencer
 */
async function getInfluencerVideoData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  influencerId: string
): Promise<VideoData[]> {
  // Get all content posts for this influencer through campaign_influencers
  const { data: campaignInfluencers } = await supabase
    .from('campaign_influencers')
    .select('id')
    .eq('influencer_id', influencerId)

  if (!campaignInfluencers || campaignInfluencers.length === 0) {
    return []
  }

  const campaignInfluencerIds = campaignInfluencers.map(ci => ci.id)

  const { data: posts } = await supabase
    .from('content_posts')
    .select('metrics, posted_at')
    .in('campaign_influencer_id', campaignInfluencerIds)
    .eq('status', 'published')

  if (!posts || posts.length === 0) {
    return []
  }

  // Transform content_posts to video data format
  return posts
    .filter(post => post.metrics) // Only include posts with metrics
    .map(post => ({
      views: post.metrics?.views || 0,
      likes: post.metrics?.likes || 0,
      comments: post.metrics?.comments || 0,
      postedAt: post.posted_at || undefined,
    }))
}

/**
 * Create fallback video data when no real content_posts exist
 * Uses influencer's average metrics as a reasonable estimate
 */
function createFallbackVideoData(influencer: Influencer): VideoData[] {
  const avgViews = influencer.average_views || 10000
  const avgLikes = influencer.average_likes || Math.round(avgViews * 0.05)
  const avgComments = influencer.average_comments || Math.round(avgViews * 0.01)

  // Create synthetic video data representing typical performance
  // This gives a reasonable baseline until real data is available
  return [
    { views: avgViews * 1.5, likes: avgLikes * 1.5, comments: avgComments * 1.5 }, // Above average
    { views: avgViews, likes: avgLikes, comments: avgComments }, // Average
    { views: avgViews * 0.8, likes: avgLikes * 0.8, comments: avgComments * 0.8 }, // Below average
    { views: avgViews * 1.2, likes: avgLikes * 1.2, comments: avgComments * 1.2 }, // Slightly above
    { views: avgViews * 0.9, likes: avgLikes * 0.9, comments: avgComments * 0.9 }, // Slightly below
  ]
}

// ============================================================================
// GET Handler - Single Influencer Ceiling Score
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CeilingScoreResponse>> {
  try {
    const { id: influencerId } = await params
    const { searchParams } = new URL(request.url)
    const forceRecalculate = searchParams.get('force') === 'true'

    if (!influencerId) {
      return NextResponse.json(
        { data: null, error: 'Influencer ID is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'Authentication required' },
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
        { data: null, error: 'User is not a member of any organization' },
        { status: 403 }
      )
    }

    // Verify influencer belongs to user's organization
    const { data: influencer, error: influencerError } = await supabase
      .from('influencers')
      .select('*')
      .eq('id', influencerId)
      .eq('organization_id', member.organization_id)
      .single()

    if (influencerError || !influencer) {
      return NextResponse.json(
        { data: null, error: 'Influencer not found or access denied' },
        { status: 404 }
      )
    }

    // Check cache unless force recalculation is requested
    if (!forceRecalculate) {
      const { data: cachedScore } = await supabase
        .from('ceiling_score_data')
        .select('*')
        .eq('influencer_id', influencerId)
        .single()

      if (cachedScore && isCacheValid(cachedScore.analyzed_at)) {
        // Return cached data
        const insights = generateInsightsFromCache(cachedScore)

        return NextResponse.json({
          data: {
            influencerId,
            ceilingScore: cachedScore.ceiling_score,
            averageScore: cachedScore.average_score,
            hiddenGemRating: cachedScore.hidden_gem_rating,
            isHiddenGem: cachedScore.hidden_gem_rating > 20,
            bestVideoViews: cachedScore.best_video_views,
            viralVideosCount: cachedScore.viral_videos_count,
            consistencyScore: cachedScore.consistency_score,
            grade: getGrade(cachedScore.ceiling_score),
            insights,
            analyzedVideos: cachedScore.analyzed_videos,
            calculatedAt: cachedScore.analyzed_at,
            cached: true,
          },
          error: null,
        })
      }
    }

    // Get video data from content_posts
    let videos = await getInfluencerVideoData(supabase, influencerId)
    let usedFallback = false

    // If no video data, create fallback from influencer averages
    if (videos.length === 0) {
      videos = createFallbackVideoData(influencer)
      usedFallback = true
    }

    // Calculate ceiling score
    const input: CeilingScoreInput = {
      videos,
      followerCount: influencer.follower_count || 0,
      totalVideoCount: videos.length,
    }

    const result = calculateCeilingScore(input)

    // Add note if using fallback data
    if (usedFallback) {
      result.insights.push('Score based on profile averages - add content posts for precise calculation')
    }

    // Upsert to ceiling_score_data table
    const now = new Date().toISOString()
    const { error: upsertError } = await supabase
      .from('ceiling_score_data')
      .upsert({
        influencer_id: influencerId,
        best_video_views: result.bestVideoViews,
        viral_videos_count: result.viralVideosCount,
        consistency_score: result.consistencyScore,
        ceiling_score: result.ceilingScore,
        average_score: result.averageScore,
        hidden_gem_rating: result.hiddenGemRating,
        analyzed_videos: videos.length,
        analyzed_at: now,
        updated_at: now,
      }, {
        onConflict: 'influencer_id',
      })

    if (upsertError) {
      console.error('[CeilingScore] Cache upsert error:', upsertError)
      // Continue even if caching fails - still return the calculated result
    }

    return NextResponse.json({
      data: {
        influencerId,
        ceilingScore: result.ceilingScore,
        averageScore: result.averageScore,
        hiddenGemRating: result.hiddenGemRating,
        isHiddenGem: result.isHiddenGem,
        bestVideoViews: result.bestVideoViews,
        viralVideosCount: result.viralVideosCount,
        consistencyScore: result.consistencyScore,
        grade: result.grade,
        insights: result.insights,
        analyzedVideos: videos.length,
        calculatedAt: now,
        cached: false,
      },
      error: null,
    })
  } catch (error) {
    console.error('[CeilingScore] Error:', error)
    return NextResponse.json(
      {
        data: null,
        error: 'Failed to calculate ceiling score',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST Handler - Batch Ceiling Score Calculation
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { influencerIds, force = false } = body as { influencerIds: string[]; force?: boolean }

    if (!influencerIds || !Array.isArray(influencerIds)) {
      return NextResponse.json(
        { data: null, error: 'influencerIds array required' },
        { status: 400 }
      )
    }

    if (influencerIds.length === 0) {
      return NextResponse.json({
        data: [],
        error: null,
      })
    }

    if (influencerIds.length > 50) {
      return NextResponse.json(
        { data: null, error: 'Maximum 50 influencers per batch request' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'Authentication required' },
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
        { data: null, error: 'User is not a member of any organization' },
        { status: 403 }
      )
    }

    // Get all influencers that belong to user's organization
    const { data: influencers, error: influencersError } = await supabase
      .from('influencers')
      .select('*')
      .in('id', influencerIds)
      .eq('organization_id', member.organization_id)

    if (influencersError || !influencers) {
      return NextResponse.json(
        { data: null, error: 'Failed to fetch influencers' },
        { status: 500 }
      )
    }

    // Check cache for all influencers
    let cachedScores: CeilingScoreDataRow[] = []
    if (!force) {
      const { data: cached } = await supabase
        .from('ceiling_score_data')
        .select('*')
        .in('influencer_id', influencerIds)

      cachedScores = cached || []
    }

    const now = new Date().toISOString()
    const results: Array<{
      influencerId: string
      ceilingScore: number
      averageScore: number
      hiddenGemRating: number
      isHiddenGem: boolean
      bestVideoViews: number
      viralVideosCount: number
      consistencyScore: number
      grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
      insights: string[]
      analyzedVideos: number
      calculatedAt: string
      cached: boolean
    }> = []

    const toUpsert: Array<{
      influencer_id: string
      best_video_views: number
      viral_videos_count: number
      consistency_score: number
      ceiling_score: number
      average_score: number
      hidden_gem_rating: number
      analyzed_videos: number
      analyzed_at: string
      updated_at: string
    }> = []

    for (const influencer of influencers) {
      // Check if we have valid cache
      const cached = cachedScores.find(c => c.influencer_id === influencer.id)

      if (cached && !force && isCacheValid(cached.analyzed_at)) {
        // Use cached data
        results.push({
          influencerId: influencer.id,
          ceilingScore: cached.ceiling_score,
          averageScore: cached.average_score,
          hiddenGemRating: cached.hidden_gem_rating,
          isHiddenGem: cached.hidden_gem_rating > 20,
          bestVideoViews: cached.best_video_views,
          viralVideosCount: cached.viral_videos_count,
          consistencyScore: cached.consistency_score,
          grade: getGrade(cached.ceiling_score),
          insights: generateInsightsFromCache(cached),
          analyzedVideos: cached.analyzed_videos,
          calculatedAt: cached.analyzed_at,
          cached: true,
        })
        continue
      }

      // Calculate new score
      let videos = await getInfluencerVideoData(supabase, influencer.id)
      let usedFallback = false

      if (videos.length === 0) {
        videos = createFallbackVideoData(influencer)
        usedFallback = true
      }

      const input: CeilingScoreInput = {
        videos,
        followerCount: influencer.follower_count || 0,
        totalVideoCount: videos.length,
      }

      const result = calculateCeilingScore(input)

      if (usedFallback) {
        result.insights.push('Score based on profile averages - add content posts for precise calculation')
      }

      results.push({
        influencerId: influencer.id,
        ceilingScore: result.ceilingScore,
        averageScore: result.averageScore,
        hiddenGemRating: result.hiddenGemRating,
        isHiddenGem: result.isHiddenGem,
        bestVideoViews: result.bestVideoViews,
        viralVideosCount: result.viralVideosCount,
        consistencyScore: result.consistencyScore,
        grade: result.grade,
        insights: result.insights,
        analyzedVideos: videos.length,
        calculatedAt: now,
        cached: false,
      })

      // Prepare for batch upsert
      toUpsert.push({
        influencer_id: influencer.id,
        best_video_views: result.bestVideoViews,
        viral_videos_count: result.viralVideosCount,
        consistency_score: result.consistencyScore,
        ceiling_score: result.ceilingScore,
        average_score: result.averageScore,
        hidden_gem_rating: result.hiddenGemRating,
        analyzed_videos: videos.length,
        analyzed_at: now,
        updated_at: now,
      })
    }

    // Batch upsert all new calculations
    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('ceiling_score_data')
        .upsert(toUpsert, {
          onConflict: 'influencer_id',
        })

      if (upsertError) {
        console.error('[CeilingScore] Batch cache upsert error:', upsertError)
        // Continue even if caching fails
      }
    }

    return NextResponse.json({
      data: results,
      error: null,
    })
  } catch (error) {
    console.error('[CeilingScore] Batch error:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to calculate ceiling scores' },
      { status: 500 }
    )
  }
}
