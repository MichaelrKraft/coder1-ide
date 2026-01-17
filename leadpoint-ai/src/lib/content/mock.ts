/**
 * Mock Content Metrics for Development
 * Provides realistic mock data when Apify API is not available
 */

import type { ContentMetrics, ContentPost, MetricsSnapshot, ContentInfluencer } from '@/types/content'

// Helper to generate random number in range
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper to generate random float with decimals
function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

/**
 * Generate mock content metrics for a single post
 */
export function getMockContentMetrics(): ContentMetrics {
  const views = randomInRange(10000, 5000000)
  const likes = Math.floor(views * randomFloat(0.02, 0.15))
  const comments = Math.floor(likes * randomFloat(0.01, 0.1))
  const shares = Math.floor(likes * randomFloat(0.005, 0.05))
  const saves = Math.floor(likes * randomFloat(0.01, 0.08))
  
  const engagement_rate = ((likes + comments + shares) / views) * 100

  return {
    views,
    likes,
    comments,
    shares,
    saves,
    engagement_rate: parseFloat(engagement_rate.toFixed(2)),
    scraped_at: new Date().toISOString(),
  }
}

/**
 * Generate mock metrics history (snapshots over time)
 */
export function getMockMetricsHistory(days: number = 7): MetricsSnapshot[] {
  const history: MetricsSnapshot[] = []
  const now = Date.now()
  
  // Start with lower metrics and grow
  let baseViews = randomInRange(1000, 10000)
  let baseLikes = Math.floor(baseViews * randomFloat(0.03, 0.1))
  let baseComments = Math.floor(baseLikes * randomFloat(0.02, 0.08))
  let baseShares = Math.floor(baseLikes * randomFloat(0.01, 0.04))
  let baseSaves = Math.floor(baseLikes * randomFloat(0.01, 0.05))

  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now - i * 24 * 60 * 60 * 1000).toISOString()
    
    // Growth factor decreases over time (viral growth curve)
    const growthFactor = Math.max(1, 1.5 - (days - i) * 0.1)
    
    baseViews = Math.floor(baseViews * growthFactor)
    baseLikes = Math.floor(baseLikes * growthFactor)
    baseComments = Math.floor(baseComments * growthFactor)
    baseShares = Math.floor(baseShares * growthFactor)
    baseSaves = Math.floor((baseSaves || 0) * growthFactor)

    history.push({
      timestamp,
      views: baseViews,
      likes: baseLikes,
      comments: baseComments,
      shares: baseShares,
      saves: baseSaves,
    })
  }

  return history
}

/**
 * Mock influencer data
 */
const mockInfluencers: ContentInfluencer[] = [
  {
    id: 'inf_001',
    username: 'fitnessmaven',
    display_name: 'Sarah Fitness',
    avatar_url: 'https://placehold.co/150x150/FF6B6B/white?text=SF',
    platform: 'tiktok',
  },
  {
    id: 'inf_002',
    username: 'techwithtom',
    display_name: 'Tom Tech',
    avatar_url: 'https://placehold.co/150x150/5D5FEF/white?text=TT',
    platform: 'tiktok',
  },
  {
    id: 'inf_003',
    username: 'beautybyella',
    display_name: 'Ella Beauty',
    avatar_url: 'https://placehold.co/150x150/FF85A2/white?text=EB',
    platform: 'tiktok',
  },
  {
    id: 'inf_004',
    username: 'chefcarlos',
    display_name: 'Chef Carlos',
    avatar_url: 'https://placehold.co/150x150/F4A261/white?text=CC',
    platform: 'tiktok',
  },
  {
    id: 'inf_005',
    username: 'travelwithjake',
    display_name: 'Jake Travels',
    avatar_url: 'https://placehold.co/150x150/00B4D8/white?text=JT',
    platform: 'tiktok',
  },
]

/**
 * Generate mock content posts for a campaign
 */
export function getMockContentPosts(
  campaignId: string,
  count: number = 10
): ContentPost[] {
  const posts: ContentPost[] = []
  const statuses: ('scheduled' | 'published' | 'removed')[] = ['published', 'published', 'published', 'scheduled', 'removed']
  const postTypes: ('video' | 'live' | 'story')[] = ['video', 'video', 'video', 'live', 'story']

  for (let i = 0; i < count; i++) {
    const influencer = mockInfluencers[i % mockInfluencers.length]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const postType = postTypes[Math.floor(Math.random() * postTypes.length)]
    const metrics = getMockContentMetrics()
    const daysAgo = randomInRange(1, 30)
    const publishDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

    const post: ContentPost = {
      id: `content_${campaignId}_${i + 1}`,
      campaign_id: campaignId,
      influencer_id: influencer.id,
      influencer,
      post_url: `https://www.tiktok.com/@${influencer.username}/video/${randomInRange(7000000000000000000, 7999999999999999999)}`,
      post_type: postType,
      platform: 'tiktok',
      status,
      expected_publish_date: status === 'scheduled' 
        ? new Date(Date.now() + randomInRange(1, 14) * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      actual_publish_date: status === 'published' ? publishDate.toISOString() : undefined,
      views: status === 'published' ? metrics.views : undefined,
      likes: status === 'published' ? metrics.likes : undefined,
      comments: status === 'published' ? metrics.comments : undefined,
      shares: status === 'published' ? metrics.shares : undefined,
      saves: status === 'published' ? metrics.saves : undefined,
      engagement_rate: status === 'published' ? metrics.engagement_rate : undefined,
      metrics_history: status === 'published' ? getMockMetricsHistory(Math.min(daysAgo, 14)) : undefined,
      last_scraped_at: status === 'published' ? metrics.scraped_at : undefined,
      thumbnail_url: `https://placehold.co/360x640/${randomInRange(100000, 999999).toString(16)}/white?text=Video`,
      caption: getMockCaption(),
      hashtags: getMockHashtags(),
      notes: Math.random() > 0.7 ? 'Great engagement on this post!' : undefined,
      created_at: new Date(Date.now() - (daysAgo + 7) * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    posts.push(post)
  }

  return posts
}

/**
 * Generate a mock caption
 */
function getMockCaption(): string {
  const captions = [
    'Check out this amazing product! Loving every moment of it.',
    'Been using this for a week and WOW the results are incredible!',
    'Finally found something that actually works! Link in bio.',
    'POV: You discover the best thing ever. Thank me later!',
    'This changed my whole routine! Had to share with you all.',
    'Collab with my favorite brand! Use code SAVE20 for discount.',
    'Honest review: Is it worth the hype? Watch to find out!',
    'Day 7 of trying this product - the results speak for themselves.',
  ]
  return captions[Math.floor(Math.random() * captions.length)]
}

/**
 * Generate mock hashtags
 */
function getMockHashtags(): string[] {
  const allHashtags = [
    'fyp', 'viral', 'trending', 'foryou', 'foryoupage',
    'review', 'honest', 'musthave', 'recommendation',
    'tiktok', 'tiktokmademebuyit', 'ad', 'sponsored',
    'lifestyle', 'daily', 'routine', 'tips', 'hack',
  ]
  
  const count = randomInRange(3, 7)
  const shuffled = allHashtags.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

/**
 * Calculate aggregate stats from content posts
 */
export function calculateContentStats(posts: ContentPost[]) {
  const publishedPosts = posts.filter(p => p.status === 'published')
  
  const totalViews = publishedPosts.reduce((sum, p) => sum + (p.views || 0), 0)
  const totalLikes = publishedPosts.reduce((sum, p) => sum + (p.likes || 0), 0)
  const totalComments = publishedPosts.reduce((sum, p) => sum + (p.comments || 0), 0)
  const totalShares = publishedPosts.reduce((sum, p) => sum + (p.shares || 0), 0)
  
  const avgEngagement = publishedPosts.length > 0
    ? publishedPosts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / publishedPosts.length
    : 0

  return {
    total_posts: posts.length,
    total_views: totalViews,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_shares: totalShares,
    avg_engagement_rate: parseFloat(avgEngagement.toFixed(2)),
    published_count: publishedPosts.length,
    scheduled_count: posts.filter(p => p.status === 'scheduled').length,
  }
}
