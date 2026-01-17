import type { TikTokVideo } from './types'
import { getFollowerTier, type FollowerTier } from './actors'

export interface InfluencerScoreFactors {
  followerCount: number
  engagementRate: number
  videoCount: number
  avgViews: number
  avgLikes: number
  avgComments: number
  isVerified: boolean
  contentRelevance: number // 0-1 based on hashtag match
  consistency: number // 0-1 based on posting frequency
  growthPotential: number // 0-1 based on engagement vs followers ratio
}

export interface InfluencerScore {
  total: number // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  breakdown: {
    reach: number // 0-25 - based on follower count
    engagement: number // 0-30 - based on engagement rate
    consistency: number // 0-20 - based on video count & posting
    relevance: number // 0-25 - based on content match
  }
  insights: string[]
}

// Score thresholds for grades
const GRADE_THRESHOLDS = {
  S: 90,
  A: 75,
  B: 60,
  C: 45,
  D: 30,
  F: 0,
}

/**
 * Calculate influencer score based on multiple factors
 */
export function calculateInfluencerScore(
  factors: InfluencerScoreFactors
): InfluencerScore {
  const insights: string[] = []

  // Reach score (0-25) - logarithmic scale for follower count
  // 1K = 5, 10K = 10, 100K = 15, 1M = 20, 10M = 25
  const reachScore = Math.min(25, Math.log10(factors.followerCount + 1) * 5)

  // Engagement score (0-30) - based on engagement rate
  // TikTok average is ~3-5%, excellent is 10%+
  let engagementScore = 0
  if (factors.engagementRate >= 10) {
    engagementScore = 30
    insights.push('Exceptional engagement rate (10%+)')
  } else if (factors.engagementRate >= 5) {
    engagementScore = 25 + (factors.engagementRate - 5) * 1
    insights.push('Above average engagement rate')
  } else if (factors.engagementRate >= 3) {
    engagementScore = 15 + (factors.engagementRate - 3) * 5
  } else if (factors.engagementRate >= 1) {
    engagementScore = 5 + (factors.engagementRate - 1) * 5
  } else {
    engagementScore = factors.engagementRate * 5
    insights.push('Below average engagement - may need audience alignment')
  }

  // Consistency score (0-20) - based on video count and posting frequency
  // More videos = more consistent
  let consistencyScore = Math.min(15, factors.videoCount / 10)
  consistencyScore += factors.consistency * 5
  consistencyScore = Math.min(20, consistencyScore)

  if (factors.videoCount >= 100) {
    insights.push('Highly active creator with 100+ videos')
  } else if (factors.videoCount < 10) {
    insights.push('New creator - limited content history')
  }

  // Relevance score (0-25) - based on content match
  const relevanceScore = factors.contentRelevance * 25
  if (factors.contentRelevance >= 0.8) {
    insights.push('Strong content alignment with target niche')
  } else if (factors.contentRelevance < 0.3) {
    insights.push('Limited relevance to target hashtags')
  }

  // Bonus for verification (up to 5 points)
  const verificationBonus = factors.isVerified ? 5 : 0
  if (factors.isVerified) {
    insights.push('Verified account - established credibility')
  }

  // Growth potential bonus (up to 5 points)
  // High engagement with lower follower count = viral potential
  const growthBonus = factors.growthPotential * 5
  if (factors.growthPotential >= 0.8) {
    insights.push('High viral potential - outperforming follower count')
  }

  // Calculate total
  const rawTotal =
    reachScore +
    engagementScore +
    consistencyScore +
    relevanceScore +
    verificationBonus +
    growthBonus

  const total = Math.min(100, Math.round(rawTotal))

  // Determine grade
  let grade: InfluencerScore['grade'] = 'F'
  for (const [g, threshold] of Object.entries(GRADE_THRESHOLDS)) {
    if (total >= threshold) {
      grade = g as InfluencerScore['grade']
      break
    }
  }

  return {
    total,
    grade,
    breakdown: {
      reach: Math.round(reachScore),
      engagement: Math.round(engagementScore),
      consistency: Math.round(consistencyScore),
      relevance: Math.round(relevanceScore),
    },
    insights,
  }
}

/**
 * Score multiple influencers from video data
 */
export function scoreInfluencersFromVideos(
  videos: TikTokVideo[],
  targetHashtags: string[]
): Map<string, InfluencerScore> {
  const scores = new Map<string, InfluencerScore>()

  // Group videos by author
  const videosByAuthor = new Map<string, TikTokVideo[]>()
  for (const video of videos) {
    const username = video.authorMeta.name
    if (!videosByAuthor.has(username)) {
      videosByAuthor.set(username, [])
    }
    videosByAuthor.get(username)!.push(video)
  }

  // Normalize target hashtags
  const targetSet = new Set(targetHashtags.map((h) => h.toLowerCase().replace('#', '')))

  // Calculate score for each author
  for (const [username, authorVideos] of Array.from(videosByAuthor.entries())) {
    const author = authorVideos[0].authorMeta

    // Calculate aggregate stats
    const totalViews = authorVideos.reduce((sum: number, v: TikTokVideo) => sum + v.stats.playCount, 0)
    const totalLikes = authorVideos.reduce((sum: number, v: TikTokVideo) => sum + v.stats.diggCount, 0)
    const totalComments = authorVideos.reduce((sum: number, v: TikTokVideo) => sum + v.stats.commentCount, 0)
    const avgViews = totalViews / authorVideos.length
    const avgLikes = totalLikes / authorVideos.length
    const avgComments = totalComments / authorVideos.length

    // Calculate engagement rate from sampled videos
    const avgEngagement = (avgLikes + avgComments) / Math.max(avgViews, 1)
    const engagementRate = avgEngagement * 100

    // Calculate relevance based on hashtag overlap
    const allHashtags = new Set<string>(
      authorVideos.flatMap((v: TikTokVideo) => v.hashtags.map((h: { name: string }) => h.name.toLowerCase()))
    )
    const overlap = Array.from(allHashtags).filter((h: string) => targetSet.has(h)).length
    const relevance = targetSet.size > 0 ? Math.min(1, overlap / targetSet.size) : 0

    // Estimate consistency (simplified - based on having multiple videos)
    const consistency = Math.min(1, authorVideos.length / 5)

    // Calculate growth potential (high engagement relative to followers)
    const expectedEngagement = author.fans * 0.03 // 3% baseline
    const actualEngagement = avgLikes + avgComments
    const growthPotential = Math.min(1, actualEngagement / Math.max(expectedEngagement, 1))

    const factors: InfluencerScoreFactors = {
      followerCount: author.fans,
      engagementRate,
      videoCount: author.video,
      avgViews,
      avgLikes,
      avgComments,
      isVerified: author.verified,
      contentRelevance: relevance,
      consistency,
      growthPotential,
    }

    scores.set(username, calculateInfluencerScore(factors))
  }

  return scores
}

/**
 * Get tier-specific score adjustments
 */
export function getTierExpectations(tier: FollowerTier): {
  expectedEngagementRate: number
  reachMultiplier: number
  description: string
} {
  const expectations: Record<
    FollowerTier,
    { expectedEngagementRate: number; reachMultiplier: number; description: string }
  > = {
    NANO: {
      expectedEngagementRate: 8,
      reachMultiplier: 0.6,
      description: 'High engagement, authentic audience, great for niche targeting',
    },
    MICRO: {
      expectedEngagementRate: 5,
      reachMultiplier: 0.8,
      description: 'Good balance of reach and engagement, cost-effective',
    },
    MID: {
      expectedEngagementRate: 4,
      reachMultiplier: 1.0,
      description: 'Established presence, reliable performance metrics',
    },
    MACRO: {
      expectedEngagementRate: 3,
      reachMultiplier: 1.2,
      description: 'Broad reach, professional content, brand awareness focus',
    },
    MEGA: {
      expectedEngagementRate: 2,
      reachMultiplier: 1.5,
      description: 'Celebrity-level reach, mass market campaigns',
    },
  }

  return expectations[tier]
}

/**
 * Compare scores for ranking
 */
export function compareScores(a: InfluencerScore, b: InfluencerScore): number {
  // Primary: total score
  if (a.total !== b.total) {
    return b.total - a.total
  }
  // Secondary: engagement (more important for ROI)
  if (a.breakdown.engagement !== b.breakdown.engagement) {
    return b.breakdown.engagement - a.breakdown.engagement
  }
  // Tertiary: relevance
  return b.breakdown.relevance - a.breakdown.relevance
}

/**
 * Filter influencers by minimum score
 */
export function filterByScore(
  scores: Map<string, InfluencerScore>,
  minTotal = 50,
  minGrade?: InfluencerScore['grade']
): Map<string, InfluencerScore> {
  const filtered = new Map<string, InfluencerScore>()

  for (const [username, score] of Array.from(scores.entries())) {
    if (score.total < minTotal) continue

    if (minGrade) {
      const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'F']
      const minGradeIndex = gradeOrder.indexOf(minGrade)
      const scoreGradeIndex = gradeOrder.indexOf(score.grade)
      if (scoreGradeIndex > minGradeIndex) continue
    }

    filtered.set(username, score)
  }

  return filtered
}

/**
 * Calculate average score for a set of influencers
 */
export function calculateAverageScore(
  scores: Map<string, InfluencerScore>
): InfluencerScore | null {
  if (scores.size === 0) return null

  let totalSum = 0
  let reachSum = 0
  let engagementSum = 0
  let consistencySum = 0
  let relevanceSum = 0

  for (const score of Array.from(scores.values())) {
    totalSum += score.total
    reachSum += score.breakdown.reach
    engagementSum += score.breakdown.engagement
    consistencySum += score.breakdown.consistency
    relevanceSum += score.breakdown.relevance
  }

  const count = scores.size
  const avgTotal = Math.round(totalSum / count)

  let avgGrade: InfluencerScore['grade'] = 'F'
  for (const [g, threshold] of Object.entries(GRADE_THRESHOLDS)) {
    if (avgTotal >= threshold) {
      avgGrade = g as InfluencerScore['grade']
      break
    }
  }

  return {
    total: avgTotal,
    grade: avgGrade,
    breakdown: {
      reach: Math.round(reachSum / count),
      engagement: Math.round(engagementSum / count),
      consistency: Math.round(consistencySum / count),
      relevance: Math.round(relevanceSum / count),
    },
    insights: [`Average score across ${count} influencers`],
  }
}
