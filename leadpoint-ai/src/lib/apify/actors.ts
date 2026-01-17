// Apify Actor IDs for TikTok scraping
export const APIFY_ACTORS = {
  TIKTOK_HASHTAG_SCRAPER: 'clockworks/tiktok-scraper',
  TIKTOK_PROFILE_SCRAPER: 'clockworks/tiktok-profile-scraper',
  // Additional actors for future use
  INSTAGRAM_PROFILE: 'apify/instagram-profile-scraper',
  INSTAGRAM_HASHTAG: 'apify/instagram-hashtag-scraper',
  YOUTUBE_CHANNEL: 'apify/youtube-scraper',
} as const

export type ApifyActorId = (typeof APIFY_ACTORS)[keyof typeof APIFY_ACTORS]

// Input configuration for TikTok Hashtag Scraper
export interface TikTokHashtagInput {
  hashtags: string[]
  resultsPerPage: number
  maxItems: number
  shouldDownloadVideos: boolean
  shouldDownloadCovers: boolean
  proxyConfiguration?: {
    useApifyProxy: boolean
    apifyProxyGroups?: string[]
  }
}

// Input configuration for TikTok Profile Scraper
export interface TikTokProfileInput {
  profiles: string[]
  resultsPerPage: number
  shouldDownloadVideos: boolean
  shouldDownloadCovers: boolean
  proxyConfiguration?: {
    useApifyProxy: boolean
    apifyProxyGroups?: string[]
  }
}

// Default input for hashtag scraping - optimized for influencer discovery
export const defaultHashtagInput: Partial<TikTokHashtagInput> = {
  resultsPerPage: 100,
  maxItems: 500,
  shouldDownloadVideos: false,
  shouldDownloadCovers: false,
  proxyConfiguration: {
    useApifyProxy: true,
  },
}

// Default input for profile scraping
export const defaultProfileInput: Partial<TikTokProfileInput> = {
  resultsPerPage: 10,
  shouldDownloadVideos: false,
  shouldDownloadCovers: false,
  proxyConfiguration: {
    useApifyProxy: true,
  },
}

// Follower tier definitions for categorizing influencers
export const FOLLOWER_TIERS = {
  NANO: { min: 1000, max: 10000, label: 'Nano' },
  MICRO: { min: 10000, max: 100000, label: 'Micro' },
  MID: { min: 100000, max: 500000, label: 'Mid-Tier' },
  MACRO: { min: 500000, max: 1000000, label: 'Macro' },
  MEGA: { min: 1000000, max: Infinity, label: 'Mega' },
} as const

export type FollowerTier = keyof typeof FOLLOWER_TIERS

// Get the tier for a follower count
export function getFollowerTier(followerCount: number): FollowerTier {
  if (followerCount < FOLLOWER_TIERS.NANO.max) return 'NANO'
  if (followerCount < FOLLOWER_TIERS.MICRO.max) return 'MICRO'
  if (followerCount < FOLLOWER_TIERS.MID.max) return 'MID'
  if (followerCount < FOLLOWER_TIERS.MACRO.max) return 'MACRO'
  return 'MEGA'
}

// Common niches for influencer categorization
export const COMMON_NICHES = [
  'fitness',
  'beauty',
  'fashion',
  'tech',
  'food',
  'travel',
  'gaming',
  'music',
  'comedy',
  'education',
  'lifestyle',
  'parenting',
  'pets',
  'sports',
  'finance',
  'health',
  'diy',
  'art',
  'photography',
  'business',
] as const

export type NicheCategory = (typeof COMMON_NICHES)[number] | 'general'
