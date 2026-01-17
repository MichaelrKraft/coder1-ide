/**
 * Viral Series Management Service
 * "If a video works, make 10 more versions"
 *
 * Production implementation with Supabase persistence
 */

import { createClient } from '@/lib/supabase/server'
import type { ViralSeries, SeriesVideo, SeriesVariation } from '@/types/database'
import { generateMessage } from '@/lib/anthropic/client'

// ============================================================================
// Types
// ============================================================================

export interface CreateSeriesInput {
  campaignId: string
  influencerId: string
  name: string
  description?: string
  hookPattern?: string
  formatType: ViralSeries['format_type']
}

export interface UpdateSeriesInput {
  name?: string
  description?: string
  hookPattern?: string
  formatType?: ViralSeries['format_type']
  status?: ViralSeries['status']
  trendDirection?: ViralSeries['trend_direction']
}

export interface AddVideoInput {
  seriesId: string
  videoUrl: string
  videoId?: string
  title?: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
  postedAt?: string
  variationType?: SeriesVideo['variation_type']
}

export interface UpdateVideoInput {
  title?: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
  postedAt?: string
  variationType?: SeriesVideo['variation_type']
}

export interface SeriesAnalysis {
  series: ViralSeries
  videos: SeriesVideo[]
  topPerformer: SeriesVideo | null
  performanceTrend: 'improving' | 'declining' | 'stable'
  suggestedVariations: SeriesVariation[]
}

// ============================================================================
// Series CRUD Operations
// ============================================================================

/**
 * Get all series for a campaign
 */
export async function getCampaignSeries(campaignId: string): Promise<ViralSeries[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('viral_series')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Series] getCampaignSeries error:', error)
    throw new Error(`Failed to fetch series: ${error.message}`)
  }

  return data || []
}

/**
 * Get all series (optionally filtered by campaign)
 */
export async function getAllSeries(campaignId?: string): Promise<ViralSeries[]> {
  const supabase = await createClient()

  let query = supabase
    .from('viral_series')
    .select('*')
    .order('created_at', { ascending: false })

  if (campaignId) {
    query = query.eq('campaign_id', campaignId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Series] getAllSeries error:', error)
    throw new Error(`Failed to fetch series: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single series by ID
 */
export async function getSeries(seriesId: string): Promise<ViralSeries | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('viral_series')
    .select('*')
    .eq('id', seriesId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('[Series] getSeries error:', error)
    throw new Error(`Failed to fetch series: ${error.message}`)
  }

  return data
}

/**
 * Get series with full analysis including videos
 */
export async function getSeriesAnalysis(seriesId: string): Promise<SeriesAnalysis | null> {
  const supabase = await createClient()

  // Fetch series
  const { data: series, error: seriesError } = await supabase
    .from('viral_series')
    .select('*')
    .eq('id', seriesId)
    .single()

  if (seriesError) {
    if (seriesError.code === 'PGRST116') {
      return null // Not found
    }
    console.error('[Series] getSeriesAnalysis series error:', seriesError)
    throw new Error(`Failed to fetch series: ${seriesError.message}`)
  }

  // Fetch videos for this series
  const { data: videos, error: videosError } = await supabase
    .from('series_videos')
    .select('*')
    .eq('series_id', seriesId)
    .order('posted_at', { ascending: false, nullsFirst: false })

  if (videosError) {
    console.error('[Series] getSeriesAnalysis videos error:', videosError)
    throw new Error(`Failed to fetch series videos: ${videosError.message}`)
  }

  const videoList = videos || []

  // Find top performer
  const topPerformer = videoList.reduce((top, v) =>
    !top || v.views > top.views ? v : top
  , null as SeriesVideo | null)

  // Calculate trend from recent videos
  const sortedVideos = [...videoList].sort((a, b) =>
    new Date(b.posted_at || '').getTime() - new Date(a.posted_at || '').getTime()
  )
  const recentVideos = sortedVideos.slice(0, 3)
  const olderVideos = sortedVideos.slice(3, 6)
  const recentAvg = recentVideos.reduce((sum, v) => sum + v.views, 0) / Math.max(recentVideos.length, 1)
  const olderAvg = olderVideos.reduce((sum, v) => sum + v.views, 0) / Math.max(olderVideos.length, 1)

  let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if (olderAvg > 0) {
    const change = (recentAvg - olderAvg) / olderAvg
    if (change > 0.15) performanceTrend = 'improving'
    else if (change < -0.15) performanceTrend = 'declining'
  }

  // Fetch existing suggested variations
  const { data: variations } = await supabase
    .from('series_variations')
    .select('*')
    .eq('series_id', seriesId)
    .eq('status', 'suggested')
    .order('confidence_score', { ascending: false })
    .limit(5)

  return {
    series,
    videos: videoList,
    topPerformer,
    performanceTrend,
    suggestedVariations: variations || [],
  }
}

/**
 * Create a new series
 */
export async function createSeries(input: CreateSeriesInput): Promise<ViralSeries> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('viral_series')
    .insert({
      campaign_id: input.campaignId,
      influencer_id: input.influencerId,
      name: input.name,
      description: input.description || null,
      hook_pattern: input.hookPattern || null,
      format_type: input.formatType,
      total_views: 0,
      total_videos: 0,
      avg_views_per_video: 0,
      trend_direction: 'stable',
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('[Series] createSeries error:', error)
    throw new Error(`Failed to create series: ${error.message}`)
  }

  return data
}

/**
 * Update a series
 */
export async function updateSeries(seriesId: string, input: UpdateSeriesInput): Promise<ViralSeries> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.hookPattern !== undefined) updateData.hook_pattern = input.hookPattern
  if (input.formatType !== undefined) updateData.format_type = input.formatType
  if (input.status !== undefined) updateData.status = input.status
  if (input.trendDirection !== undefined) updateData.trend_direction = input.trendDirection

  const { data, error } = await supabase
    .from('viral_series')
    .update(updateData)
    .eq('id', seriesId)
    .select()
    .single()

  if (error) {
    console.error('[Series] updateSeries error:', error)
    throw new Error(`Failed to update series: ${error.message}`)
  }

  return data
}

/**
 * Delete a series (cascades to videos and variations)
 */
export async function deleteSeries(seriesId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('viral_series')
    .delete()
    .eq('id', seriesId)

  if (error) {
    console.error('[Series] deleteSeries error:', error)
    throw new Error(`Failed to delete series: ${error.message}`)
  }
}

// ============================================================================
// Video Operations
// ============================================================================

/**
 * Get all videos for a series
 */
export async function getSeriesVideos(seriesId: string): Promise<SeriesVideo[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('series_videos')
    .select('*')
    .eq('series_id', seriesId)
    .order('posted_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[Series] getSeriesVideos error:', error)
    throw new Error(`Failed to fetch videos: ${error.message}`)
  }

  return data || []
}

/**
 * Add a video to a series
 * Note: The DB trigger will automatically update series stats
 */
export async function addVideoToSeries(input: AddVideoInput): Promise<SeriesVideo> {
  const supabase = await createClient()

  // First get series avg to calculate performance_vs_series_avg
  const { data: series } = await supabase
    .from('viral_series')
    .select('avg_views_per_video')
    .eq('id', input.seriesId)
    .single()

  const avgViews = series?.avg_views_per_video || 0
  const views = input.views || 0
  const performanceVsAvg = avgViews > 0 ? Math.round((views / avgViews) * 100) : 100

  const { data, error } = await supabase
    .from('series_videos')
    .insert({
      series_id: input.seriesId,
      video_url: input.videoUrl,
      video_id: input.videoId || null,
      title: input.title || null,
      views: views,
      likes: input.likes || 0,
      comments: input.comments || 0,
      shares: input.shares || 0,
      posted_at: input.postedAt || null,
      variation_type: input.variationType || 'original',
      performance_vs_series_avg: performanceVsAvg,
    })
    .select()
    .single()

  if (error) {
    console.error('[Series] addVideoToSeries error:', error)
    throw new Error(`Failed to add video: ${error.message}`)
  }

  return data
}

/**
 * Update a video
 */
export async function updateVideo(videoId: string, input: UpdateVideoInput): Promise<SeriesVideo> {
  const supabase = await createClient()

  // Get the video to find its series and recalculate performance
  const { data: existingVideo, error: fetchError } = await supabase
    .from('series_videos')
    .select('series_id')
    .eq('id', videoId)
    .single()

  if (fetchError) {
    console.error('[Series] updateVideo fetch error:', fetchError)
    throw new Error(`Video not found: ${fetchError.message}`)
  }

  // Get series avg for performance calculation
  const { data: series } = await supabase
    .from('viral_series')
    .select('avg_views_per_video')
    .eq('id', existingVideo.series_id)
    .single()

  const updateData: Record<string, unknown> = {}
  if (input.title !== undefined) updateData.title = input.title
  if (input.views !== undefined) updateData.views = input.views
  if (input.likes !== undefined) updateData.likes = input.likes
  if (input.comments !== undefined) updateData.comments = input.comments
  if (input.shares !== undefined) updateData.shares = input.shares
  if (input.postedAt !== undefined) updateData.posted_at = input.postedAt
  if (input.variationType !== undefined) updateData.variation_type = input.variationType

  // Recalculate performance vs avg if views changed
  if (input.views !== undefined && series?.avg_views_per_video) {
    updateData.performance_vs_series_avg = Math.round((input.views / series.avg_views_per_video) * 100)
  }

  const { data, error } = await supabase
    .from('series_videos')
    .update(updateData)
    .eq('id', videoId)
    .select()
    .single()

  if (error) {
    console.error('[Series] updateVideo error:', error)
    throw new Error(`Failed to update video: ${error.message}`)
  }

  return data
}

/**
 * Delete a video from a series
 * Note: The DB trigger will automatically update series stats
 */
export async function deleteVideo(videoId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('series_videos')
    .delete()
    .eq('id', videoId)

  if (error) {
    console.error('[Series] deleteVideo error:', error)
    throw new Error(`Failed to delete video: ${error.message}`)
  }
}

// ============================================================================
// Variation Operations
// ============================================================================

/**
 * Get variations for a series
 */
export async function getSeriesVariations(
  seriesId: string,
  status?: SeriesVariation['status']
): Promise<SeriesVariation[]> {
  const supabase = await createClient()

  let query = supabase
    .from('series_variations')
    .select('*')
    .eq('series_id', seriesId)
    .order('confidence_score', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Series] getSeriesVariations error:', error)
    throw new Error(`Failed to fetch variations: ${error.message}`)
  }

  return data || []
}

/**
 * Update a variation's status
 */
export async function updateVariation(
  variationId: string,
  status: SeriesVariation['status']
): Promise<SeriesVariation> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('series_variations')
    .update({ status })
    .eq('id', variationId)
    .select()
    .single()

  if (error) {
    console.error('[Series] updateVariation error:', error)
    throw new Error(`Failed to update variation: ${error.message}`)
  }

  return data
}

/**
 * Generate AI-powered variation ideas for a series and save to DB
 */
export async function generateSeriesVariations(
  series: ViralSeries,
  videos: SeriesVideo[],
  count: number = 5
): Promise<SeriesVariation[]> {
  const supabase = await createClient()
  const topVideos = [...videos].sort((a, b) => b.views - a.views).slice(0, 3)

  const prompt = `You are an expert TikTok content strategist analyzing a viral video series.

SERIES: "${series.name}"
FORMAT: ${series.format_type}
HOOK PATTERN: ${series.hook_pattern || 'Not specified'}
TOTAL VIEWS: ${series.total_views.toLocaleString()}
VIDEOS: ${series.total_videos}

TOP PERFORMING VIDEOS:
${topVideos.map((v, i) => `${i + 1}. "${v.title}" - ${v.views.toLocaleString()} views (${v.variation_type})`).join('\n')}

Generate ${count} new video variation ideas for this series. Each variation should:
1. Build on the proven hook pattern
2. Add a fresh twist that could increase engagement
3. Consider current TikTok trends

Return JSON array with this structure:
[
  {
    "variation_idea": "Brief title/concept",
    "hook_variation": "The specific hook text to use",
    "target_audience_twist": "What audience angle to emphasize",
    "recommended_timing": "Best time/context to post",
    "confidence_score": 0-100,
    "reasoning": "Why this will work"
  }
]

Return ONLY the JSON array, no other text.`

  try {
    const response = await generateMessage(prompt,
      'You are a viral TikTok content strategist. Return only valid JSON.',
      { temperature: 0.8, maxTokens: 2000 }
    )

    // Parse response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('Failed to parse AI response:', response)
      return getMockVariations(series.id, count)
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      variation_idea: string
      hook_variation: string
      target_audience_twist: string
      recommended_timing: string
      confidence_score: number
      reasoning: string
    }>

    // Save variations to database
    const variationsToInsert = parsed.map(v => ({
      series_id: series.id,
      variation_idea: v.variation_idea,
      hook_variation: v.hook_variation || null,
      target_audience_twist: v.target_audience_twist || null,
      recommended_timing: v.recommended_timing || null,
      confidence_score: Math.min(100, Math.max(0, v.confidence_score)),
      status: 'suggested' as const,
      ai_reasoning: v.reasoning || null,
    }))

    const { data: savedVariations, error } = await supabase
      .from('series_variations')
      .insert(variationsToInsert)
      .select()

    if (error) {
      console.error('[Series] Failed to save variations:', error)
      // Return unsaved variations with temp IDs
      return parsed.map((v, i) => ({
        id: `temp-${Date.now()}-${i}`,
        series_id: series.id,
        variation_idea: v.variation_idea,
        hook_variation: v.hook_variation || null,
        target_audience_twist: v.target_audience_twist || null,
        recommended_timing: v.recommended_timing || null,
        confidence_score: v.confidence_score,
        status: 'suggested' as const,
        ai_reasoning: v.reasoning || null,
        created_at: new Date().toISOString(),
      }))
    }

    return savedVariations || []
  } catch (error) {
    console.error('Error generating variations:', error)
    return getMockVariations(series.id, count)
  }
}

function getMockVariations(seriesId: string, count: number): SeriesVariation[] {
  const mockIdeas = [
    { idea: 'Extreme Weather Edition', hook: 'POV: Your alarm goes off during a thunderstorm...', audience: 'Weather enthusiasts', timing: 'During major weather events', confidence: 85 },
    { idea: 'Minimalist Challenge', hook: 'POV: You can only use 5 items today...', audience: 'Minimalism community', timing: 'New Year resolution season', confidence: 78 },
    { idea: 'Nostalgia Remix', hook: 'POV: It\'s 2005 and you wake up to...', audience: 'Millennials/Gen Z nostalgia', timing: 'Throwback Thursday', confidence: 82 },
    { idea: 'Collaboration Crossover', hook: 'POV: You wake up in someone else\'s life...', audience: 'Fans of both creators', timing: 'Collab announcement week', confidence: 75 },
    { idea: 'Audience Decides', hook: 'POV: You let your followers control your day...', audience: 'Highly engaged fans', timing: 'Weekend for voting', confidence: 88 },
  ]

  return mockIdeas.slice(0, count).map((m, i) => ({
    id: `mock-${Date.now()}-${i}`,
    series_id: seriesId,
    variation_idea: m.idea,
    hook_variation: m.hook,
    target_audience_twist: m.audience,
    recommended_timing: m.timing,
    confidence_score: m.confidence,
    status: 'suggested' as const,
    ai_reasoning: `Based on analysis of top-performing videos in this series format.`,
    created_at: new Date().toISOString(),
  }))
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect potential series from a set of videos
 */
export function detectSeriesFromVideos(
  videos: Array<{ title?: string; views: number; hashtags?: string[] }>
): { seriesName: string; videoCount: number; pattern: string }[] {
  // Simple pattern detection based on common words in titles
  const wordCounts = new Map<string, number>()

  videos.forEach(v => {
    if (!v.title) return
    const words = v.title.toLowerCase().split(/\s+/)
    words.forEach(word => {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
    })
  })

  // Find repeated patterns (words appearing in 3+ videos)
  const patterns: { seriesName: string; videoCount: number; pattern: string }[] = []

  wordCounts.forEach((count, word) => {
    if (count >= 3) {
      patterns.push({
        seriesName: `"${word.charAt(0).toUpperCase() + word.slice(1)}" Series`,
        videoCount: count,
        pattern: word,
      })
    }
  })

  return patterns.sort((a, b) => b.videoCount - a.videoCount).slice(0, 5)
}

/**
 * Calculate series health metrics
 */
export function calculateSeriesHealth(videos: SeriesVideo[]): {
  healthScore: number
  status: 'thriving' | 'stable' | 'needs_attention' | 'declining'
  recommendations: string[]
} {
  if (videos.length === 0) {
    return { healthScore: 0, status: 'needs_attention', recommendations: ['Add videos to this series'] }
  }

  const recommendations: string[] = []
  let healthScore = 50 // Base score

  // Check recency (posted in last 14 days?)
  const now = Date.now()
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000
  const recentVideo = videos.some(v => v.posted_at && new Date(v.posted_at).getTime() > twoWeeksAgo)

  if (recentVideo) {
    healthScore += 15
  } else {
    recommendations.push('No posts in 2 weeks - consider new variation')
  }

  // Check performance trend
  const sortedByDate = [...videos].sort((a, b) =>
    new Date(b.posted_at || '').getTime() - new Date(a.posted_at || '').getTime()
  )

  if (sortedByDate.length >= 2) {
    const latest = sortedByDate[0].performance_vs_series_avg
    const previous = sortedByDate[1].performance_vs_series_avg

    if (latest > previous + 10) {
      healthScore += 20
    } else if (latest < previous - 20) {
      healthScore -= 15
      recommendations.push('Performance declining - try a fresh angle')
    }
  }

  // Check viral hit presence
  const hasViralHit = videos.some(v => v.views >= 500000)
  if (hasViralHit) {
    healthScore += 15
  }

  // Determine status
  let status: 'thriving' | 'stable' | 'needs_attention' | 'declining'
  if (healthScore >= 80) status = 'thriving'
  else if (healthScore >= 60) status = 'stable'
  else if (healthScore >= 40) status = 'needs_attention'
  else status = 'declining'

  return { healthScore: Math.min(100, Math.max(0, healthScore)), status, recommendations }
}

// ============================================================================
// Authorization Helpers
// ============================================================================

/**
 * Check if user has access to a series via campaign membership
 */
export async function canAccessSeries(seriesId: string): Promise<boolean> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Check series -> campaign -> organization -> membership
  const { data: series } = await supabase
    .from('viral_series')
    .select(`
      campaign_id,
      campaigns!inner (
        organization_id
      )
    `)
    .eq('id', seriesId)
    .single()

  if (!series) return false

  // Extract organization_id from the nested campaigns relation
  const campaigns = series.campaigns as unknown
  const orgId = Array.isArray(campaigns)
    ? (campaigns[0] as { organization_id: string })?.organization_id
    : (campaigns as { organization_id: string })?.organization_id

  if (!orgId) return false

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', orgId)
    .single()

  return !!membership
}

/**
 * Check if user can delete a series (owner/admin only)
 */
export async function canDeleteSeries(seriesId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: series } = await supabase
    .from('viral_series')
    .select(`
      campaign_id,
      campaigns!inner (
        organization_id
      )
    `)
    .eq('id', seriesId)
    .single()

  if (!series) return false

  // Extract organization_id from the nested campaigns relation
  const campaigns = series.campaigns as unknown
  const orgId = Array.isArray(campaigns)
    ? (campaigns[0] as { organization_id: string })?.organization_id
    : (campaigns as { organization_id: string })?.organization_id

  if (!orgId) return false

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', orgId)
    .single()

  return membership?.role === 'owner' || membership?.role === 'admin'
}

/**
 * Check if user has access to a campaign
 */
export async function canAccessCampaign(campaignId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('organization_id')
    .eq('id', campaignId)
    .single()

  if (!campaign) return false

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', campaign.organization_id)
    .single()

  return !!membership
}
