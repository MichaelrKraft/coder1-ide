import { runActor, runActorAsync, getResultsByRunId } from './client'

// ============================================================================
// Email Extraction Utilities
// ============================================================================

/**
 * Extract email address from bio/signature text
 * Filters out common placeholder/example emails
 */
export function extractEmailFromBio(bio: string): string | null {
  if (!bio) return null

  // Email regex pattern
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = bio.match(emailRegex)

  if (!matches || matches.length === 0) {
    return null
  }

  // Filter out common placeholder/example emails
  const excludePatterns = [
    'example',
    'email',
    'your',
    'test',
    'sample',
    'placeholder',
    'dummy',
    'fake',
    'noreply',
    'no-reply',
    'donotreply',
    'support@',
    'info@example',
    'user@example',
  ]

  // Find the first valid email that's not a placeholder
  const validEmail = matches.find((email) => {
    const lowerEmail = email.toLowerCase()
    return !excludePatterns.some((pattern) => lowerEmail.includes(pattern))
  })

  return validEmail || null
}

/**
 * Extract multiple emails from text (useful for contact pages)
 */
export function extractAllEmailsFromText(text: string): string[] {
  if (!text) return []

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex)

  if (!matches) return []

  // Deduplicate and filter
  const uniqueEmails = [...new Set(matches.map((e) => e.toLowerCase()))]

  // Filter out obvious placeholders
  return uniqueEmails.filter((email) => {
    return (
      !email.includes('example') &&
      !email.includes('test') &&
      !email.includes('placeholder')
    )
  })
}

/**
 * Check if a string looks like a business/collab email
 * (useful for prioritizing contact emails)
 */
export function isBusinessEmail(email: string): boolean {
  if (!email) return false

  const businessIndicators = [
    'business',
    'collab',
    'booking',
    'work',
    'partner',
    'sponsor',
    'inquiries',
    'contact',
    'management',
    'mgmt',
    'agent',
    'pr@',
    'press',
    'media',
  ]

  const lowerEmail = email.toLowerCase()
  return businessIndicators.some((indicator) => lowerEmail.includes(indicator))
}
import {
  APIFY_ACTORS,
  defaultHashtagInput,
  defaultProfileInput,
  getFollowerTier,
  COMMON_NICHES,
  type NicheCategory,
} from './actors'
import type {
  TikTokVideo,
  TikTokProfile,
  DiscoveredInfluencer,
  TikTokVideoSummary,
  DiscoveryFilters,
} from './types'
import { scoreInfluencersFromVideos, type InfluencerScore } from './scoring'
import { getMockDiscoveryResults, getMockProfileResults } from './mock'

// Check if we're in development/mock mode
const USE_MOCK_DATA = process.env.APIFY_USE_MOCK === 'true' || !process.env.APIFY_API_TOKEN

export interface DiscoveryOptions {
  hashtags: string[]
  maxResults?: number
  webhookUrl?: string
  useMock?: boolean
}

export interface DiscoveryResult {
  influencers: DiscoveredInfluencer[]
  scores: Map<string, InfluencerScore>
  totalVideosAnalyzed: number
  uniqueCreators: number
}

/**
 * Discover influencers by hashtags
 * Can run synchronously (returns results) or async (returns run ID for webhook)
 */
export async function discoverInfluencers(
  options: DiscoveryOptions
): Promise<string | TikTokVideo[]> {
  // Use mock data in development
  if (USE_MOCK_DATA || options.useMock) {
    console.log('[Apify] Using mock data for discovery')
    return getMockDiscoveryResults(options.hashtags)
  }

  const input = {
    ...defaultHashtagInput,
    hashtags: options.hashtags,
    maxItems: options.maxResults || 500,
  }

  // If webhook URL provided, run async and return run ID
  if (options.webhookUrl) {
    return runActorAsync(APIFY_ACTORS.TIKTOK_HASHTAG_SCRAPER, input, options.webhookUrl)
  }

  // Otherwise run synchronously and return results
  return runActor<TikTokVideo>(APIFY_ACTORS.TIKTOK_HASHTAG_SCRAPER, input)
}

/**
 * Get profile details for specific usernames
 */
export async function getProfileDetails(
  usernames: string[],
  useMock = USE_MOCK_DATA
): Promise<TikTokProfile[]> {
  if (useMock) {
    console.log('[Apify] Using mock data for profiles')
    return getMockProfileResults(usernames)
  }

  const input = {
    ...defaultProfileInput,
    profiles: usernames.map((u) => `https://www.tiktok.com/@${u}`),
  }

  return runActor<TikTokProfile>(APIFY_ACTORS.TIKTOK_PROFILE_SCRAPER, input)
}

/**
 * Get results from a completed async run
 */
export async function getDiscoveryResults(runId: string): Promise<TikTokVideo[]> {
  return getResultsByRunId<TikTokVideo>(runId)
}

/**
 * Transform raw TikTok video data to our influencer format
 */
export function transformToInfluencer(
  video: TikTokVideo,
  score?: InfluencerScore
): DiscoveredInfluencer {
  const author = video.authorMeta

  // Extract email from bio/signature if present
  const contactEmail = extractEmailFromBio(author.signature || '')

  return {
    platform: 'tiktok' as const,
    username: author.name,
    display_name: author.nickName,
    profile_url: `https://tiktok.com/@${author.name}`,
    avatar_url: author.avatar,
    follower_count: author.fans,
    following_count: author.following,
    total_likes: author.heart,
    video_count: author.video,
    engagement_rate: calculateEngagementRate(video.stats, author.fans),
    is_verified: author.verified,
    bio: author.signature || '',
    contact_email: contactEmail,
    niche: extractNiche(video.hashtags, video.text),
    tier: getFollowerTier(author.fans),
    discovered_via: video.hashtags.map((h) => h.name),
    discovered_at: new Date().toISOString(),
  }
}

/**
 * Transform video to summary format
 */
export function transformToVideoSummary(video: TikTokVideo): TikTokVideoSummary {
  return {
    id: video.id,
    text: video.text,
    likes: video.stats.diggCount,
    comments: video.stats.commentCount,
    shares: video.stats.shareCount,
    plays: video.stats.playCount,
    created_at: new Date(video.createTime * 1000).toISOString(),
    url: video.webVideoUrl,
    hashtags: video.hashtags.map((h) => h.name),
  }
}

/**
 * Process discovery results into unique influencers with scores
 */
export function processDiscoveryResults(
  videos: TikTokVideo[],
  targetHashtags: string[],
  filters?: DiscoveryFilters
): DiscoveryResult {
  // Calculate scores for all influencers
  const scores = scoreInfluencersFromVideos(videos, targetHashtags)

  // Group videos by author to deduplicate
  const videosByAuthor = new Map<string, TikTokVideo[]>()
  for (const video of videos) {
    const username = video.authorMeta.name
    if (!videosByAuthor.has(username)) {
      videosByAuthor.set(username, [])
    }
    videosByAuthor.get(username)!.push(video)
  }

  // Transform to influencer format
  const influencers: DiscoveredInfluencer[] = []

  for (const [username, authorVideos] of Array.from(videosByAuthor.entries())) {
    const primaryVideo = authorVideos[0]
    const score = scores.get(username)
    const influencer = transformToInfluencer(primaryVideo, score)

    // Add recent videos summary
    influencer.recent_videos = authorVideos
      .slice(0, 5)
      .map(transformToVideoSummary)

    // Apply filters
    if (filters) {
      if (filters.minFollowers && influencer.follower_count < filters.minFollowers) continue
      if (filters.maxFollowers && influencer.follower_count > filters.maxFollowers) continue
      if (filters.minEngagementRate && influencer.engagement_rate < filters.minEngagementRate) continue
      if (filters.isVerified !== undefined && influencer.is_verified !== filters.isVerified) continue
      if (filters.niches?.length && !filters.niches.includes(influencer.niche)) continue
      if (filters.tiers?.length && !filters.tiers.includes(influencer.tier)) continue
    }

    influencers.push(influencer)
  }

  // Sort by score (highest first)
  influencers.sort((a, b) => {
    const scoreA = scores.get(a.username)?.total || 0
    const scoreB = scores.get(b.username)?.total || 0
    return scoreB - scoreA
  })

  return {
    influencers,
    scores,
    totalVideosAnalyzed: videos.length,
    uniqueCreators: videosByAuthor.size,
  }
}

/**
 * Calculate engagement rate from video stats
 */
function calculateEngagementRate(
  stats: TikTokVideo['stats'],
  followers: number
): number {
  if (followers === 0) return 0
  const engagements = stats.diggCount + stats.commentCount + stats.shareCount
  return Math.round((engagements / followers) * 10000) / 100 // percentage with 2 decimals
}

/**
 * Extract niche from hashtags and text
 */
function extractNiche(
  hashtags: Array<{ name: string }>,
  text: string
): NicheCategory {
  const allText = [
    ...hashtags.map((h) => h.name.toLowerCase()),
    text.toLowerCase(),
  ].join(' ')

  // Check for common niches
  for (const niche of COMMON_NICHES) {
    if (allText.includes(niche)) {
      return niche
    }
  }

  // Check for related keywords
  const nicheKeywords: Record<NicheCategory, string[]> = {
    fitness: ['gym', 'workout', 'exercise', 'muscle', 'gains', 'fit'],
    beauty: ['makeup', 'skincare', 'cosmetics', 'glow', 'skin'],
    fashion: ['style', 'outfit', 'ootd', 'clothes', 'wear'],
    tech: ['gadget', 'device', 'app', 'software', 'phone', 'computer'],
    food: ['recipe', 'cooking', 'eat', 'meal', 'chef', 'kitchen'],
    travel: ['trip', 'vacation', 'explore', 'adventure', 'destination'],
    gaming: ['game', 'gamer', 'play', 'stream', 'esports'],
    music: ['song', 'sing', 'dance', 'beat', 'melody', 'artist'],
    comedy: ['funny', 'laugh', 'joke', 'humor', 'meme'],
    education: ['learn', 'teach', 'tips', 'howto', 'tutorial'],
    lifestyle: ['life', 'daily', 'routine', 'vlog'],
    parenting: ['mom', 'dad', 'baby', 'kids', 'family', 'parent'],
    pets: ['dog', 'cat', 'pet', 'puppy', 'kitten', 'animal'],
    sports: ['ball', 'team', 'athlete', 'score', 'match'],
    finance: ['money', 'invest', 'stock', 'crypto', 'wealth', 'budget'],
    health: ['healthy', 'wellness', 'mental', 'nutrition', 'diet'],
    diy: ['craft', 'handmade', 'create', 'build', 'project'],
    art: ['draw', 'paint', 'artist', 'creative', 'design'],
    photography: ['photo', 'camera', 'shoot', 'portrait', 'lens'],
    business: ['entrepreneur', 'startup', 'hustle', 'success', 'brand'],
    general: [],
  }

  for (const [niche, keywords] of Object.entries(nicheKeywords)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        return niche as NicheCategory
      }
    }
  }

  return 'general'
}

/**
 * Batch process multiple hashtag searches
 */
export async function batchDiscoverInfluencers(
  hashtagGroups: string[][],
  maxResultsPerGroup = 200,
  useMock = USE_MOCK_DATA
): Promise<DiscoveryResult> {
  const allVideos: TikTokVideo[] = []
  const allHashtags: string[] = []

  for (const hashtags of hashtagGroups) {
    const videos = await discoverInfluencers({
      hashtags,
      maxResults: maxResultsPerGroup,
      useMock,
    })

    if (Array.isArray(videos)) {
      allVideos.push(...videos)
      allHashtags.push(...hashtags)
    }
  }

  return processDiscoveryResults(allVideos, allHashtags)
}
