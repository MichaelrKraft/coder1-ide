/**
 * Apify Discovery Service for LeadPoint.ai
 * Handles influencer discovery via Instagram hashtag scraping
 */

import { apifyClient, getRunResults } from './client'
import { APIFY_ACTORS } from './actors'
import type {
  DiscoveredInfluencer,
  ApifyInstagramPost,
  ApifyInstagramProfile,
} from '@/types/discovery'
import type { Platform } from '@/types/database'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_RESULTS = 500
const ESTIMATED_TIME_PER_100_RESULTS = 30 // seconds

// ============================================================================
// Mock Data for Development
// ============================================================================

const MOCK_INFLUENCERS: DiscoveredInfluencer[] = [
  {
    platform: 'instagram',
    platform_id: 'mock_12345',
    username: 'fitness_guru_jane',
    display_name: 'Jane Fitness',
    profile_url: 'https://instagram.com/fitness_guru_jane',
    avatar_url: 'https://picsum.photos/seed/jane/200',
    bio: 'Certified Personal Trainer | Transform your body & mind | DM for coaching',
    follower_count: 125000,
    following_count: 1200,
    engagement_rate: 4.5,
    average_likes: 5600,
    average_comments: 250,
    average_views: 15000,
    categories: ['fitness', 'health', 'wellness'],
    location: 'Los Angeles, CA',
    language: 'en',
    email: 'jane@fitnessguru.com',
    verified: true,
    post_count: 1250,
  },
  {
    platform: 'instagram',
    platform_id: 'mock_67890',
    username: 'healthy_eats_mike',
    display_name: 'Mike Healthy',
    profile_url: 'https://instagram.com/healthy_eats_mike',
    avatar_url: 'https://picsum.photos/seed/mike/200',
    bio: 'Plant-based recipes | Meal prep tips | Making healthy eating easy',
    follower_count: 85000,
    following_count: 900,
    engagement_rate: 5.2,
    average_likes: 4400,
    average_comments: 180,
    average_views: null,
    categories: ['food', 'health', 'vegan'],
    location: 'New York, NY',
    language: 'en',
    email: null,
    verified: false,
    post_count: 890,
  },
  {
    platform: 'instagram',
    platform_id: 'mock_11111',
    username: 'yoga_with_sarah',
    display_name: 'Sarah Yoga',
    profile_url: 'https://instagram.com/yoga_with_sarah',
    avatar_url: 'https://picsum.photos/seed/sarah/200',
    bio: 'RYT-500 Yoga Teacher | Daily flows & meditations | Online classes available',
    follower_count: 210000,
    following_count: 500,
    engagement_rate: 3.8,
    average_likes: 7980,
    average_comments: 320,
    average_views: 25000,
    categories: ['yoga', 'wellness', 'mindfulness'],
    location: 'Austin, TX',
    language: 'en',
    email: 'sarah@yogawithsarah.com',
    verified: true,
    post_count: 2100,
  },
]

// ============================================================================
// Check if Mock Mode
// ============================================================================

export function isMockMode(): boolean {
  return !process.env.APIFY_API_TOKEN
}

// ============================================================================
// Discover Influencers (Sync Mode)
// ============================================================================

export async function discoverInfluencers(
  hashtags: string[],
  maxResults: number = DEFAULT_MAX_RESULTS,
  platform: Platform = 'instagram'
): Promise<DiscoveredInfluencer[]> {
  // Check for mock mode
  if (isMockMode()) {
    console.warn('[Apify Discovery] Running in MOCK MODE - APIFY_API_TOKEN not set')
    return generateMockInfluencers(hashtags, maxResults)
  }

  // Only Instagram is supported currently
  if (platform !== 'instagram') {
    throw new Error(`Platform ${platform} is not yet supported for discovery`)
  }

  try {
    // Run the Instagram hashtag scraper
    const run = await apifyClient.actor(APIFY_ACTORS.INSTAGRAM_HASHTAG).call({
      hashtags: hashtags.map((h: string) => h.replace(/^#/, '')), // Remove # prefix if present
      resultsLimit: maxResults,
      // Additional options
      searchType: 'hashtag',
      searchLimit: Math.min(maxResults, 100), // Limit per hashtag
    })

    // Wait for completion and get results
    const items = await getRunResults<ApifyInstagramPost>(run.defaultDatasetId)

    // Transform posts to unique influencers
    return transformPostsToInfluencers(items)
  } catch (error) {
    console.error('[Apify Discovery] Error during sync discovery:', error)
    throw error
  }
}

// ============================================================================
// Run Actor Async (For Webhook Mode)
// ============================================================================

export async function runActorAsync(
  hashtags: string[],
  maxResults: number = DEFAULT_MAX_RESULTS,
  webhookUrl: string
): Promise<{ actorRunId: string; estimatedTime: number }> {
  // Check for mock mode
  if (isMockMode()) {
    console.warn('[Apify Discovery] Running in MOCK MODE - APIFY_API_TOKEN not set')
    // Return a mock run ID
    return {
      actorRunId: `mock_run_${Date.now()}`,
      estimatedTime: 5, // 5 seconds for mock
    }
  }

  try {
    // Start the actor without waiting
    const run = await apifyClient.actor(APIFY_ACTORS.INSTAGRAM_HASHTAG).start(
      {
        hashtags: hashtags.map((h: string) => h.replace(/^#/, '')),
        resultsLimit: maxResults,
        searchType: 'hashtag',
        searchLimit: Math.min(maxResults, 100),
      },
      {
        webhooks: [
          {
            eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED'],
            requestUrl: webhookUrl,
          },
        ],
      }
    )

    // Calculate estimated time
    const estimatedTime = Math.ceil((maxResults / 100) * ESTIMATED_TIME_PER_100_RESULTS)

    return {
      actorRunId: run.id,
      estimatedTime,
    }
  } catch (error) {
    console.error('[Apify Discovery] Error starting async actor:', error)
    throw error
  }
}

// ============================================================================
// Get Results from Dataset
// ============================================================================

export async function getDiscoveryResults(datasetId: string): Promise<DiscoveredInfluencer[]> {
  // Check for mock mode
  if (isMockMode()) {
    console.warn('[Apify Discovery] Running in MOCK MODE')
    return MOCK_INFLUENCERS
  }

  try {
    const items = await getRunResults<ApifyInstagramPost>(datasetId)
    return transformPostsToInfluencers(items)
  } catch (error) {
    console.error('[Apify Discovery] Error fetching results:', error)
    throw error
  }
}

// ============================================================================
// Transform Apify Data to Influencer Format
// ============================================================================

function transformPostsToInfluencers(posts: ApifyInstagramPost[]): DiscoveredInfluencer[] {
  // Group posts by owner
  const ownerMap = new Map<string, ApifyInstagramPost[]>()

  for (const post of posts) {
    const existing = ownerMap.get(post.ownerId) || []
    existing.push(post)
    ownerMap.set(post.ownerId, existing)
  }

  // Transform grouped posts to influencers
  const influencers: DiscoveredInfluencer[] = []

  ownerMap.forEach((ownerPosts: ApifyInstagramPost[], ownerId: string) => {
    const firstPost = ownerPosts[0]

    // Calculate average engagement from posts
    const avgLikes = Math.round(
      ownerPosts.reduce((sum: number, p: ApifyInstagramPost) => sum + (p.likesCount || 0), 0) / ownerPosts.length
    )
    const avgComments = Math.round(
      ownerPosts.reduce((sum: number, p: ApifyInstagramPost) => sum + (p.commentsCount || 0), 0) / ownerPosts.length
    )
    const videoPosts = ownerPosts.filter((p: ApifyInstagramPost) => p.videoViewCount)
    const avgViews = videoPosts.length > 0
      ? Math.round(
          ownerPosts.reduce((sum: number, p: ApifyInstagramPost) => sum + (p.videoViewCount || 0), 0) /
            videoPosts.length
        )
      : null

    // Extract categories from hashtags
    const allHashtags = ownerPosts.flatMap((p: ApifyInstagramPost) => p.hashtags || [])
    const uniqueHashtags = Array.from(new Set(allHashtags))
    const categories = uniqueHashtags.slice(0, 5)

    influencers.push({
      platform: 'instagram',
      platform_id: ownerId,
      username: firstPost.ownerUsername,
      display_name: firstPost.ownerUsername, // Will be enriched later
      profile_url: `https://instagram.com/${firstPost.ownerUsername}`,
      avatar_url: null, // Would need profile scrape
      bio: null, // Would need profile scrape
      follower_count: 0, // Would need profile scrape
      following_count: 0, // Would need profile scrape
      engagement_rate: null, // Would need profile scrape + follower count
      average_likes: avgLikes,
      average_comments: avgComments,
      average_views: avgViews,
      categories,
      location: null, // Would need profile scrape
      language: null, // Would need profile scrape
      email: null, // Would need profile scrape
      verified: false, // Would need profile scrape
      post_count: ownerPosts.length,
    })
  })

  return influencers
}

// ============================================================================
// Transform Profile Data (for enrichment)
// ============================================================================

export function transformProfileToInfluencer(
  profile: ApifyInstagramProfile
): DiscoveredInfluencer {
  // Calculate engagement rate if we have posts
  let engagementRate: number | null = null
  let avgLikes: number | null = null
  let avgComments: number | null = null
  let avgViews: number | null = null

  if (profile.latestPosts && profile.latestPosts.length > 0 && profile.followersCount > 0) {
    avgLikes = Math.round(
      profile.latestPosts.reduce((sum: number, p: ApifyInstagramPost) => sum + (p.likesCount || 0), 0) /
        profile.latestPosts.length
    )
    avgComments = Math.round(
      profile.latestPosts.reduce((sum: number, p: ApifyInstagramPost) => sum + (p.commentsCount || 0), 0) /
        profile.latestPosts.length
    )
    engagementRate = Number(
      (((avgLikes + avgComments) / profile.followersCount) * 100).toFixed(2)
    )

    const videoPosts = profile.latestPosts.filter((p: ApifyInstagramPost) => p.videoViewCount)
    if (videoPosts.length > 0) {
      avgViews = Math.round(
        videoPosts.reduce((sum: number, p: ApifyInstagramPost) => sum + (p.videoViewCount || 0), 0) / videoPosts.length
      )
    }
  }

  // Extract categories from posts
  const categories = profile.latestPosts
    ? Array.from(new Set(profile.latestPosts.flatMap((p: ApifyInstagramPost) => p.hashtags || []))).slice(0, 5)
    : []

  return {
    platform: 'instagram',
    platform_id: profile.id,
    username: profile.username,
    display_name: profile.fullName || profile.username,
    profile_url: `https://instagram.com/${profile.username}`,
    avatar_url: profile.profilePicUrlHD || profile.profilePicUrl,
    bio: profile.biography,
    follower_count: profile.followersCount,
    following_count: profile.followsCount,
    engagement_rate: engagementRate,
    average_likes: avgLikes,
    average_comments: avgComments,
    average_views: avgViews,
    categories: profile.businessCategoryName
      ? [profile.businessCategoryName, ...categories]
      : categories,
    location: profile.locationName,
    language: null, // Not available from profile
    email: profile.businessEmail,
    verified: profile.isVerified,
    post_count: profile.postsCount,
  }
}

// ============================================================================
// Generate Mock Influencers
// ============================================================================

function generateMockInfluencers(
  hashtags: string[],
  maxResults: number
): DiscoveredInfluencer[] {
  // Return base mock influencers with some variation based on hashtags
  const baseInfluencers = [...MOCK_INFLUENCERS]

  // Generate additional mock influencers if needed
  const count = Math.min(maxResults, 20) // Cap at 20 for mock
  const result: DiscoveredInfluencer[] = []

  for (let i = 0; i < count; i++) {
    const base = baseInfluencers[i % baseInfluencers.length]
    result.push({
      ...base,
      platform_id: `mock_${Date.now()}_${i}`,
      username: `${base.username}_${i + 1}`,
      follower_count: base.follower_count + Math.floor(Math.random() * 50000),
      categories: [...hashtags.slice(0, 2), ...base.categories.slice(0, 2)],
    })
  }

  return result
}

// ============================================================================
// Estimate Discovery Time
// ============================================================================

export function estimateDiscoveryTime(maxResults: number): number {
  return Math.ceil((maxResults / 100) * ESTIMATED_TIME_PER_100_RESULTS)
}
