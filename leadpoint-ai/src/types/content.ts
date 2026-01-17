/**
 * Content Tracking Types for LeadPoint.ai
 * Types for managing and tracking influencer content posts
 */

import type { Platform } from './database'

// Content post types
export type ContentPostType = 'video' | 'live' | 'story'
export type ContentStatus = 'scheduled' | 'published' | 'removed'

// Metrics snapshot for tracking over time
export interface MetricsSnapshot {
  timestamp: string
  views: number
  likes: number
  comments: number
  shares: number
  saves?: number
}

// Content metrics from scraping
export interface ContentMetrics {
  views: number
  likes: number
  comments: number
  shares: number
  saves?: number
  engagement_rate: number
  scraped_at: string
}

// Influencer summary for content display
export interface ContentInfluencer {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  platform: Platform
}

// Full content post with all data
export interface ContentPost {
  id: string
  campaign_id: string
  influencer_id: string
  influencer?: ContentInfluencer
  post_url: string
  post_type: ContentPostType
  platform: Platform
  status: ContentStatus
  expected_publish_date?: string
  actual_publish_date?: string
  
  // Metrics
  views?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  engagement_rate?: number
  
  // Tracking
  metrics_history?: MetricsSnapshot[]
  last_scraped_at?: string
  
  // Metadata
  thumbnail_url?: string
  caption?: string
  hashtags?: string[]
  notes?: string
  
  created_at: string
  updated_at: string
}

// API request types
export interface CreateContentRequest {
  campaign_id: string
  influencer_id: string
  post_url: string
  post_type: ContentPostType
  expected_publish_date?: string
  notes?: string
}

export interface UpdateContentRequest {
  status?: ContentStatus
  notes?: string
  expected_publish_date?: string
  actual_publish_date?: string
  // Manual metric overrides
  views?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
}

// API response types
export interface ContentListResponse {
  data: ContentPost[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats?: ContentStats
}

export interface ContentStats {
  total_posts: number
  total_views: number
  total_likes: number
  total_comments: number
  total_shares: number
  avg_engagement_rate: number
  published_count: number
  scheduled_count: number
}

// Filter options for content listing
export interface ContentFilters {
  campaign_id?: string
  influencer_id?: string
  status?: ContentStatus
  post_type?: ContentPostType
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
  sort?: 'created_at' | 'views' | 'likes' | 'engagement_rate' | 'actual_publish_date'
  order?: 'asc' | 'desc'
}

// TikTok video data structure (from scraping)
export interface TikTokVideoData {
  id: string
  desc: string
  createTime: number
  video: {
    cover: string
    playAddr: string
    duration: number
  }
  author: {
    id: string
    uniqueId: string
    nickname: string
    avatarThumb: string
  }
  stats: {
    diggCount: number
    shareCount: number
    commentCount: number
    playCount: number
    collectCount: number
  }
  challenges?: Array<{
    title: string
  }>
}

// URL parsing result
export interface ParsedPostUrl {
  platform: Platform
  username?: string
  postId?: string
  isValid: boolean
  error?: string
}
