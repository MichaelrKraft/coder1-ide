// TikTok Video data structure from Apify scraper
export interface TikTokVideo {
  id: string
  text: string
  createTime: number
  authorMeta: {
    id: string
    name: string
    nickName: string
    verified: boolean
    signature: string
    avatar: string
    following: number
    fans: number
    heart: number
    video: number
    digg: number
  }
  musicMeta: {
    musicId: string
    musicName: string
    musicAuthor: string
    musicOriginal: boolean
    playUrl: string
    coverThumb: string
    duration: number
  }
  videoMeta: {
    width: number
    height: number
    duration: number
    ratio: string
    coverUrl: string
    dynamicCoverUrl: string
    downloadUrl?: string
  }
  stats: {
    diggCount: number // likes
    shareCount: number
    commentCount: number
    playCount: number
    collectCount: number
  }
  hashtags: Array<{
    id: string
    name: string
    title?: string
    cover?: string
  }>
  mentions: Array<{
    id: string
    name: string
  }>
  webVideoUrl: string
  videoUrl?: string
  covers?: {
    default: string
    origin: string
    dynamic: string
  }
}

// TikTok Profile data structure
export interface TikTokProfile {
  id: string
  uniqueId: string
  nickname: string
  signature: string
  avatar: string
  avatarLarger?: string
  avatarMedium?: string
  verified: boolean
  secUid: string
  privateAccount: boolean
  region?: string
  commerceUserInfo?: {
    commerceUser: boolean
    offlineRecordExpire?: number
  }
  stats: {
    followingCount: number
    followerCount: number
    heartCount: number
    videoCount: number
    diggCount: number
  }
  recentVideos?: TikTokVideo[]
}

// Transformed influencer format for our application
export interface DiscoveredInfluencer {
  platform: 'tiktok' | 'instagram' | 'youtube'
  username: string
  display_name: string
  profile_url: string
  avatar_url: string
  follower_count: number
  following_count: number
  total_likes: number
  video_count: number
  engagement_rate: number
  is_verified: boolean
  bio: string
  contact_email?: string | null // Email extracted from bio
  niche: string
  tier: string
  recent_videos?: TikTokVideoSummary[]
  discovered_via?: string[] // hashtags used to discover
  discovered_at?: string
}

// Simplified video summary for storage
export interface TikTokVideoSummary {
  id: string
  text: string
  likes: number
  comments: number
  shares: number
  plays: number
  created_at: string
  url: string
  hashtags: string[]
}

// Apify webhook payload structure
export interface ApifyWebhookPayload {
  eventType: 'ACTOR.RUN.SUCCEEDED' | 'ACTOR.RUN.FAILED' | 'ACTOR.RUN.ABORTED'
  eventData: {
    actorId: string
    actorRunId: string
    exitCode?: number
    startedAt: string
    finishedAt: string
    status: string
  }
  resource: {
    id: string
    actId: string
    userId: string
    startedAt: string
    finishedAt: string
    status: string
    statusMessage?: string
    isStatusMessageTerminal: boolean
    defaultKeyValueStoreId: string
    defaultDatasetId: string
    defaultRequestQueueId: string
  }
}

// Discovery job status
export interface DiscoveryJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  hashtags: string[]
  run_id?: string
  dataset_id?: string
  influencers_found?: number
  started_at: string
  completed_at?: string
  error_message?: string
}

// Filter options for influencer discovery
export interface DiscoveryFilters {
  minFollowers?: number
  maxFollowers?: number
  minEngagementRate?: number
  isVerified?: boolean
  niches?: string[]
  tiers?: string[]
}
