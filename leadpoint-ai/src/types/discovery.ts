/**
 * Discovery-specific types for LeadPoint.ai
 * Types for influencer discovery runs and usage tracking
 */

import type { Platform, SubscriptionPlan } from './database'

// ============================================================================
// Discovery Run Types
// ============================================================================

export type DiscoveryStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface DiscoveryRun {
  id: string
  organization_id: string
  campaign_id: string
  hashtags: string[]
  status: DiscoveryStatus
  actor_run_id: string | null
  dataset_id: string | null
  results_count: number | null
  max_results: number
  platform: Platform
  started_at: string
  completed_at: string | null
  error_message: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// ============================================================================
// Discovery Request/Response Types
// ============================================================================

export interface DiscoveryRequest {
  campaign_id: string
  hashtags: string[]
  max_results?: number // default 500
  platform?: Platform // default 'instagram'
  use_webhook?: boolean // if true, returns job_id immediately
}

export interface DiscoverySyncResponse {
  influencers: DiscoveredInfluencer[]
  total: number
  discovery_run_id: string
}

export interface DiscoveryAsyncResponse {
  job_id: string
  status: 'pending'
  estimated_time: number // seconds
}

export type DiscoveryResponse = DiscoverySyncResponse | DiscoveryAsyncResponse

export function isAsyncResponse(response: DiscoveryResponse): response is DiscoveryAsyncResponse {
  return 'job_id' in response && response.status === 'pending'
}

// ============================================================================
// Discovered Influencer Types
// ============================================================================

export interface DiscoveredInfluencer {
  platform: Platform
  platform_id: string
  username: string
  display_name: string
  profile_url: string
  avatar_url: string | null
  bio: string | null
  follower_count: number
  following_count: number
  engagement_rate: number | null
  average_likes: number | null
  average_comments: number | null
  average_views: number | null
  categories: string[]
  location: string | null
  language: string | null
  email: string | null
  verified: boolean
  post_count: number | null
}

// ============================================================================
// Apify Raw Data Types
// ============================================================================

export interface ApifyInstagramProfile {
  id: string
  username: string
  fullName: string
  profilePicUrl: string
  profilePicUrlHD: string
  biography: string
  externalUrl: string | null
  followersCount: number
  followsCount: number
  postsCount: number
  isVerified: boolean
  isPrivate: boolean
  businessCategoryName: string | null
  businessEmail: string | null
  businessPhoneNumber: string | null
  businessAddressJson: string | null
  locationId: string | null
  locationName: string | null
  igtvVideoCount: number
  // Additional fields from hashtag scraper
  latestPosts?: ApifyInstagramPost[]
}

export interface ApifyInstagramPost {
  id: string
  type: string
  shortCode: string
  caption: string
  hashtags: string[]
  mentions: string[]
  url: string
  commentsCount: number
  likesCount: number
  videoViewCount: number | null
  timestamp: string
  ownerUsername: string
  ownerId: string
}

export interface ApifyInstagramHashtagResult {
  id: string
  hashtag: string
  posts: ApifyInstagramPost[]
  postsCount: number
}

// ============================================================================
// Usage Tracking Types
// ============================================================================

export interface UsageQuota {
  lookups_used: number
  lookups_limit: number
  lookups_remaining: number
  period_start: string
  period_end: string
  plan: SubscriptionPlan
}

export interface UsageDeduction {
  organization_id: string
  amount: number
  reason: string
  discovery_run_id?: string
  created_at: string
}

// ============================================================================
// Webhook Types
// ============================================================================

export type ApifyEventType =
  | 'ACTOR.RUN.SUCCEEDED'
  | 'ACTOR.RUN.FAILED'
  | 'ACTOR.RUN.ABORTED'
  | 'ACTOR.RUN.TIMED_OUT'

export interface ApifyWebhookPayload {
  eventType: ApifyEventType
  eventData: {
    actorId: string
    actorRunId: string
    defaultDatasetId: string
  }
  resource: {
    id: string
    actId: string
    status: string
    startedAt: string
    finishedAt: string | null
    defaultDatasetId: string
    defaultKeyValueStoreId: string
  }
  createdAt: string
}

// ============================================================================
// Discovery Job Status Types
// ============================================================================

export interface DiscoveryJobStatus {
  job_id: string
  status: DiscoveryStatus
  progress?: {
    current: number
    total: number
    percentage: number
  }
  results_count?: number
  error_message?: string
  started_at: string
  completed_at?: string
  estimated_completion?: string
}

// ============================================================================
// Database Insert Types
// ============================================================================

export type DiscoveryRunInsert = Omit<
  DiscoveryRun,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type DiscoveryRunUpdate = Partial<
  Omit<DiscoveryRun, 'id' | 'organization_id' | 'created_at' | 'created_by'>
>
