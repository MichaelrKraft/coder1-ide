// LeadPoint.ai - Type Definitions

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// ============================================================================
// Influencer Types
// ============================================================================

export type Platform = "instagram" | "tiktok" | "youtube" | "twitter";

export interface Influencer {
  id: string;
  user_id: string;
  platform: Platform;
  username: string;
  profile_url: string;
  follower_count: number;
  engagement_rate: number;
  avg_views: number | null;
  niche: string[];
  location: string | null;
  email: string | null;
  bio: string | null;
  profile_image_url: string | null;
  verified: boolean;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface InfluencerMetrics {
  influencer_id: string;
  date: string;
  followers: number;
  following: number;
  posts_count: number;
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  avg_views: number | null;
}

export interface InfluencerFilters {
  platform?: Platform;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  maxEngagement?: number;
  niches?: string[];
  location?: string;
  verified?: boolean;
}

// ============================================================================
// Pipeline Types
// ============================================================================

export type PipelineStage =
  | "discovered"
  | "researching"
  | "contacted"
  | "negotiating"
  | "contracted"
  | "active"
  | "completed"
  | "declined";

export interface PipelineItem {
  id: string;
  user_id: string;
  influencer_id: string;
  influencer: Influencer;
  stage: PipelineStage;
  priority: "low" | "medium" | "high";
  notes: string | null;
  deal_value: number | null;
  expected_close_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineColumn {
  id: PipelineStage;
  title: string;
  items: PipelineItem[];
}

// ============================================================================
// Outreach Types
// ============================================================================

export type OutreachStatus =
  | "draft"
  | "scheduled"
  | "sent"
  | "delivered"
  | "opened"
  | "replied"
  | "bounced";

export interface OutreachMessage {
  id: string;
  user_id: string;
  influencer_id: string;
  influencer: Influencer;
  subject: string;
  body: string;
  status: OutreachStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutreachSequence {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  steps: OutreachStep[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutreachStep {
  id: string;
  sequence_id: string;
  order: number;
  template_id: string;
  delay_days: number;
  condition: "always" | "if_no_reply" | "if_opened";
}

// ============================================================================
// Content Types
// ============================================================================

export type ContentType = "post" | "story" | "reel" | "video" | "tweet";
export type ContentStatus = "draft" | "review" | "approved" | "published";

export interface Content {
  id: string;
  user_id: string;
  influencer_id: string | null;
  campaign_id: string | null;
  type: ContentType;
  platform: Platform;
  title: string;
  description: string | null;
  content_url: string | null;
  thumbnail_url: string | null;
  status: ContentStatus;
  scheduled_at: string | null;
  published_at: string | null;
  performance: ContentPerformance | null;
  created_at: string;
  updated_at: string;
}

export interface ContentPerformance {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement_rate: number;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  budget: number;
  status: "draft" | "active" | "paused" | "completed";
  goals: CampaignGoal[];
  created_at: string;
  updated_at: string;
}

export interface CampaignGoal {
  metric: string;
  target: number;
  current: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsSummary {
  total_influencers: number;
  total_reach: number;
  total_engagement: number;
  avg_engagement_rate: number;
  total_content: number;
  total_campaigns: number;
  active_campaigns: number;
  roi: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface PlatformBreakdown {
  platform: Platform;
  count: number;
  percentage: number;
}

export interface TopPerformer {
  influencer: Influencer;
  metric: string;
  value: number;
}

// ============================================================================
// Subscription & Billing Types
// ============================================================================

export type SubscriptionTier = "starter" | "growth" | "scale";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageLimit {
  tier: SubscriptionTier;
  influencer_limit: number;
  outreach_limit: number;
  campaign_limit: number;
  team_members: number;
  api_calls: number;
}

export const USAGE_LIMITS: Record<SubscriptionTier, UsageLimit> = {
  starter: {
    tier: "starter",
    influencer_limit: 100,
    outreach_limit: 500,
    campaign_limit: 3,
    team_members: 1,
    api_calls: 1000,
  },
  growth: {
    tier: "growth",
    influencer_limit: 1000,
    outreach_limit: 5000,
    campaign_limit: 10,
    team_members: 5,
    api_calls: 10000,
  },
  scale: {
    tier: "scale",
    influencer_limit: -1, // unlimited
    outreach_limit: -1,
    campaign_limit: -1,
    team_members: -1,
    api_calls: -1,
  },
};

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// ============================================================================
// AI Types
// ============================================================================

export interface AIAnalysis {
  id: string;
  type: "influencer" | "content" | "campaign";
  target_id: string;
  analysis: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    recommendations: string[];
    score: number;
  };
  created_at: string;
}

export interface AIGeneratedContent {
  id: string;
  type: "outreach" | "caption" | "hashtags" | "brief";
  prompt: string;
  result: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}
