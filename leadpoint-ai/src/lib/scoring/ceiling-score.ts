/**
 * Ceiling-Based Influencer Scoring
 * Based on David Park's methodology: Score on max potential, not averages
 * "An influencer who hit 1M views once has PROVEN viral capability"
 */

import type { TikTokVideo } from '@/lib/apify/types'

export interface CeilingScoreResult {
  ceilingScore: number       // 0-100
  averageScore: number       // 0-100 traditional
  hiddenGemRating: number    // ceilingScore - averageScore
  isHiddenGem: boolean       // hiddenGemRating > 20
  bestVideoViews: number
  viralVideosCount: number   // 500K+ views
  consistencyScore: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  insights: string[]
}

export interface CeilingScoreInput {
  videos: {
    views: number
    likes: number
    comments: number
    postedAt?: string
  }[]
  followerCount: number
  totalVideoCount: number
}

const VIRAL_THRESHOLD = 500000 // 500K views = viral
const CEILING_BENCHMARK = 1000000 // 1M views = max ceiling score

/**
 * Calculate ceiling-based score for an influencer
 * Formula: ceiling = (best_video/1M × 40) + (viral_count × 4, max 20) + (consistency × 0.4)
 */
export function calculateCeilingScore(input: CeilingScoreInput): CeilingScoreResult {
  const insights: string[] = []

  // Find best performing video
  const bestVideoViews = Math.max(...input.videos.map(v => v.views), 0)

  // Count viral videos (500K+ views)
  const viralVideosCount = input.videos.filter(v => v.views >= VIRAL_THRESHOLD).length

  // Calculate consistency score based on posting regularity and video count
  const consistencyScore = calculateConsistency(input.videos, input.totalVideoCount)

  // CEILING SCORE FORMULA (David Park methodology)
  // Best video contributes up to 40 points (scales with 1M benchmark)
  const ceilingComponent = Math.min(40, (bestVideoViews / CEILING_BENCHMARK) * 40)

  // Viral videos contribute up to 20 points (4 points each, max 5 videos)
  const viralComponent = Math.min(20, viralVideosCount * 4)

  // Consistency contributes up to 40 points
  const consistencyComponent = consistencyScore * 0.4

  const ceilingScore = Math.round(ceilingComponent + viralComponent + consistencyComponent)

  // Calculate traditional average-based score for comparison
  const avgViews = input.videos.reduce((sum, v) => sum + v.views, 0) / Math.max(input.videos.length, 1)
  const avgEngagement = input.videos.reduce((sum, v) => sum + v.likes + v.comments, 0) / Math.max(input.videos.length, 1)
  const averageScore = calculateAverageBasedScore(avgViews, avgEngagement, input.followerCount)

  // Hidden gem rating: how much potential is being missed by average scoring
  const hiddenGemRating = ceilingScore - averageScore
  const isHiddenGem = hiddenGemRating > 20

  // Generate insights
  if (bestVideoViews >= CEILING_BENCHMARK) {
    insights.push(`Hit ${formatViews(bestVideoViews)} views - Proven viral capability!`)
  } else if (bestVideoViews >= VIRAL_THRESHOLD) {
    insights.push(`Best video: ${formatViews(bestVideoViews)} views - Strong viral potential`)
  }

  if (viralVideosCount >= 3) {
    insights.push(`${viralVideosCount} viral videos (500K+) - Consistent viral performer`)
  } else if (viralVideosCount === 1) {
    insights.push(`1 viral hit - Can replicate with right content`)
  }

  if (isHiddenGem) {
    insights.push(`HIDDEN GEM: Ceiling ${ceilingScore} vs Average ${averageScore} - Undervalued!`)
  }

  if (consistencyScore < 30) {
    insights.push(`Inconsistent posting - viral hits may be harder to replicate`)
  }

  // Determine grade based on ceiling score
  const grade = getGrade(ceilingScore)

  return {
    ceilingScore,
    averageScore,
    hiddenGemRating,
    isHiddenGem,
    bestVideoViews,
    viralVideosCount,
    consistencyScore,
    grade,
    insights,
  }
}

function calculateConsistency(videos: { postedAt?: string }[], totalVideoCount: number): number {
  // Base score from total video count (more videos = more consistent)
  const volumeScore = Math.min(50, (totalVideoCount / 100) * 50)

  // If we have dates, calculate posting frequency consistency
  const datedVideos = videos.filter(v => v.postedAt).map(v => new Date(v.postedAt!).getTime())

  if (datedVideos.length < 2) {
    return volumeScore
  }

  datedVideos.sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < datedVideos.length; i++) {
    gaps.push((datedVideos[i] - datedVideos[i - 1]) / (1000 * 60 * 60 * 24)) // days
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  // Ideal posting: every 2-3 days. Score decreases as gap increases
  const frequencyScore = Math.max(0, 50 - (avgGap - 3) * 5)

  return Math.round((volumeScore + frequencyScore) / 2)
}

function calculateAverageBasedScore(avgViews: number, avgEngagement: number, followers: number): number {
  const viewScore = Math.min(30, Math.log10(avgViews + 1) * 6)
  const engagementRate = (avgEngagement / Math.max(followers, 1)) * 100
  const engagementScore = Math.min(40, engagementRate * 5)
  const reachScore = Math.min(30, Math.log10(followers + 1) * 6)
  return Math.round(viewScore + engagementScore + reachScore)
}

function getGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(0)}K`
  return views.toString()
}

/**
 * Calculate ceiling scores for multiple influencers from video data
 */
export function batchCalculateCeilingScores(
  influencerVideos: Map<string, TikTokVideo[]>,
  influencerData: Map<string, { followerCount: number; totalVideoCount: number }>
): Map<string, CeilingScoreResult> {
  const results = new Map<string, CeilingScoreResult>()

  for (const [influencerId, videos] of influencerVideos.entries()) {
    const data = influencerData.get(influencerId)
    if (!data) continue

    const input: CeilingScoreInput = {
      videos: videos.map(v => ({
        views: v.stats.playCount,
        likes: v.stats.diggCount,
        comments: v.stats.commentCount,
        postedAt: v.createTime ? new Date(v.createTime * 1000).toISOString() : undefined,
      })),
      followerCount: data.followerCount,
      totalVideoCount: data.totalVideoCount,
    }

    results.set(influencerId, calculateCeilingScore(input))
  }

  return results
}

/**
 * Sort influencers by ceiling score, prioritizing hidden gems
 */
export function sortByPotential(
  scores: Map<string, CeilingScoreResult>,
  prioritizeHiddenGems = true
): string[] {
  const entries = Array.from(scores.entries())

  return entries
    .sort(([, a], [, b]) => {
      // Hidden gems get priority boost
      if (prioritizeHiddenGems) {
        if (a.isHiddenGem && !b.isHiddenGem) return -1
        if (!a.isHiddenGem && b.isHiddenGem) return 1
      }
      // Then sort by ceiling score
      return b.ceilingScore - a.ceilingScore
    })
    .map(([id]) => id)
}

/**
 * Export helper for formatting views in UI
 */
export { formatViews }
