/**
 * Database types for LeadPoint.ai
 * Generated for Supabase integration with full TypeScript support
 */

// Enums
export type SubscriptionPlan = 'free' | 'starter' | 'growth' | 'scale'

export type PipelineStage =
  | 'discovered'
  | 'researching'
  | 'outreach_pending'
  | 'contacted'
  | 'in_negotiation'
  | 'deal_signed'
  | 'content_in_progress'
  | 'content_posted'
  | 'completed'
  | 'declined'
  | 'unresponsive'

export type MemberRole = 'owner' | 'admin' | 'member'

export type OutreachStatus = 'draft' | 'sent' | 'opened' | 'replied' | 'bounced'

// Email tracking status for Resend integration
export type EmailStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'

export type ContentStatus = 'scheduled' | 'published' | 'removed'

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin'

// Base table types
export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  subscription_plan: SubscriptionPlan
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  monthly_discovery_credits: number
  monthly_outreach_credits: number
  credits_reset_at: string
  settings: OrganizationSettings
  created_at: string
  updated_at: string
}

export interface OrganizationSettings {
  default_outreach_tone?: 'professional' | 'casual' | 'friendly'
  auto_followup_enabled?: boolean
  followup_delay_days?: number
  brand_guidelines?: string
  preferred_platforms?: Platform[]
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: MemberRole
  invited_by: string | null
  invited_at: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  organization_id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  goals: CampaignGoals
  target_audience: TargetAudience
  budget_range: BudgetRange | null
  start_date: string | null
  end_date: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CampaignGoals {
  primary_goal?: 'brand_awareness' | 'engagement' | 'conversions' | 'content_creation'
  target_reach?: number
  target_engagement_rate?: number
  target_conversions?: number
  kpis?: string[]
}

export interface TargetAudience {
  age_range?: { min: number; max: number }
  genders?: ('male' | 'female' | 'other')[]
  locations?: string[]
  interests?: string[]
  languages?: string[]
}

export interface BudgetRange {
  min: number
  max: number
  currency: string
}

export interface Influencer {
  id: string
  organization_id: string
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
  contact_info: ContactInfo | null
  metrics_updated_at: string | null
  ai_analysis: AIAnalysis | null
  created_at: string
  updated_at: string
}

export interface ContactInfo {
  email?: string
  phone?: string
  website?: string
  agency?: string
  manager_name?: string
  manager_email?: string
}

export interface AIAnalysis {
  content_quality_score?: number
  authenticity_score?: number
  brand_safety_score?: number
  audience_quality_score?: number
  growth_trend?: 'growing' | 'stable' | 'declining'
  content_themes?: string[]
  posting_frequency?: string
  best_posting_times?: string[]
  audience_demographics?: {
    age_groups?: Record<string, number>
    gender_split?: Record<string, number>
    top_locations?: string[]
  }
  analyzed_at?: string
}

export interface CampaignInfluencer {
  id: string
  campaign_id: string
  influencer_id: string
  stage: PipelineStage
  score: InfluencerScore | null
  notes: string | null
  contract_value: number | null
  contract_currency: string | null
  deliverables: Deliverable[] | null
  stage_changed_at: string
  added_by: string
  created_at: string
  updated_at: string
}

export interface InfluencerScore {
  overall: number
  relevance: number
  engagement: number
  authenticity: number
  brand_fit: number
  value_score: number
  reasoning?: string
}

export interface Deliverable {
  type: 'post' | 'story' | 'reel' | 'video' | 'live' | 'article'
  quantity: number
  description?: string
  due_date?: string
  completed?: boolean
}

export interface OutreachMessage {
  id: string
  campaign_influencer_id: string
  message_type: 'initial' | 'followup' | 'negotiation' | 'contract' | 'custom'
  subject: string | null
  body: string
  ai_generated: boolean
  ai_prompt: string | null
  personalization_data: Record<string, unknown> | null
  status: OutreachStatus
  sent_at: string | null
  opened_at: string | null
  replied_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Email tracking fields for Resend integration
  email_message_id: string | null
  email_status: EmailStatus | null
  opened_count: number
  clicked_count: number
  last_opened_at: string | null
  last_clicked_at: string | null
  bounce_reason: string | null
}

export interface ContentPost {
  id: string
  campaign_influencer_id: string
  platform: Platform
  post_type: 'post' | 'story' | 'reel' | 'video' | 'live' | 'article'
  post_url: string | null
  post_id: string | null
  caption: string | null
  media_urls: string[] | null
  posted_at: string | null
  status: ContentStatus
  metrics: ContentMetrics | null
  metrics_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface ContentMetrics {
  views?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  reach?: number
  impressions?: number
  engagement_rate?: number
  clicks?: number
  conversions?: number
}

// User profile (from Supabase auth)
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// Database schema definition for Supabase client
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>
      }
      organization_members: {
        Row: OrganizationMember
        Insert: Omit<OrganizationMember, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<OrganizationMember, 'id' | 'created_at'>>
      }
      campaigns: {
        Row: Campaign
        Insert: Omit<Campaign, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Campaign, 'id' | 'created_at'>>
      }
      influencers: {
        Row: Influencer
        Insert: Omit<Influencer, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Influencer, 'id' | 'created_at'>>
      }
      campaign_influencers: {
        Row: CampaignInfluencer
        Insert: Omit<CampaignInfluencer, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<CampaignInfluencer, 'id' | 'created_at'>>
      }
      outreach_messages: {
        Row: OutreachMessage
        Insert: Omit<OutreachMessage, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<OutreachMessage, 'id' | 'created_at'>>
      }
      content_posts: {
        Row: ContentPost
        Insert: Omit<ContentPost, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<ContentPost, 'id' | 'created_at'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_plan: SubscriptionPlan
      pipeline_stage: PipelineStage
      member_role: MemberRole
      outreach_status: OutreachStatus
      content_status: ContentStatus
      platform: Platform
    }
  }
}

// Series Management (David Park methodology)
// "If a video works, make 10 more versions. Series content is the key to content repeatability."
export interface Series {
  id: string
  campaign_id: string
  influencer_id: string
  name: string
  description: string | null
  hook_pattern: string | null  // The hook that made it successful
  format_type: 'educational' | 'storytelling' | 'trend' | 'challenge' | 'review' | 'transformation' | 'other'
  total_views: number
  total_videos: number
  avg_views_per_video: number
  trend_direction: 'growing' | 'stable' | 'declining'
  status: 'active' | 'paused' | 'completed'
  created_at: string
  updated_at: string
}

export interface SeriesVideo {
  id: string
  series_id: string
  video_url: string
  video_id: string | null
  title: string | null
  views: number
  likes: number
  comments: number
  shares: number
  posted_at: string | null
  variation_type: 'original' | 'iteration' | 'trend_adaptation' | 'cross_promote'
  performance_vs_series_avg: number // percentage (e.g., 125 = 25% above avg)
  created_at: string
}

export interface SeriesVariation {
  id: string
  series_id: string
  variation_idea: string
  hook_variation: string | null
  target_audience_twist: string | null
  recommended_timing: string | null
  confidence_score: number // 0-100
  status: 'suggested' | 'approved' | 'in_production' | 'published' | 'rejected'
  ai_reasoning: string | null
  created_at: string
}

// Ceiling-Based Scoring (David Park methodology)
// "An influencer who hit 1M views once has PROVEN viral capability"
export interface CeilingScoreData {
  influencer_id: string
  best_video_views: number
  viral_videos_count: number // Videos with 500K+ views
  consistency_score: number // 0-100 based on posting regularity
  ceiling_score: number // Calculated: best_video/1M × 40 + viral_count × 20 + consistency × 0.4
  average_score: number // Traditional average-based score
  hidden_gem_rating: number // ceiling_score - average_score (higher = more potential)
  analyzed_videos: number
  analyzed_at: string
}

// Full database row for ceiling_score_data table
export interface CeilingScoreDataRow {
  id: string
  influencer_id: string
  best_video_views: number
  viral_videos_count: number
  consistency_score: number
  ceiling_score: number
  average_score: number
  hidden_gem_rating: number
  analyzed_videos: number
  analyzed_at: string
  created_at: string
  updated_at: string
}

// Deal Structure Calculator (David Park methodology)
// "Never pay per video - bundle for efficiency. 3-packs get 20% off, 5-packs get 35% off."
export interface DealCalculation {
  influencer_id: string
  base_rate_per_video: number
  videos_count: number
  bundle_discount_percent: number
  platform_multiplier: number
  urgency_premium_percent: number
  exclusivity_premium_percent: number
  usage_rights_premium_percent: number
  subtotal: number
  total_discount: number
  final_price: number
  price_per_video_effective: number
  negotiation_tips: string[]
  deal_rating: 'excellent' | 'good' | 'fair' | 'overpriced'
  comparable_market_rate: number
  savings_vs_individual: number
}

export interface DealTerms {
  videosCount: number
  platform: 'tiktok' | 'instagram' | 'youtube'
  contentType: 'reel' | 'story' | 'post' | 'video' | 'short'
  exclusivityDays: number
  usageRights: 'organic_only' | 'paid_ads' | 'full_buyout'
  isUrgent: boolean
  turnaroundDays: number
}

// Content Brief Generation (David Park methodology)
// "Brief should match influencer's natural style, not brand voice. Let them be authentic."
export interface ContentBrief {
  id: string
  campaign_id: string
  influencer_id: string
  campaign_influencer_id: string
  title: string
  hook_options: string[]
  talking_points: string[]
  call_to_action: string
  product_mentions: ProductMention[]
  influencer_style_analysis: InfluencerStyleAnalysis
  restrictions: string[]
  dos_and_donts: { dos: string[]; donts: string[] }
  estimated_duration: string
  format_suggestion: 'talking_head' | 'voiceover' | 'trend_format' | 'storytelling' | 'demo' | 'review'
  status: 'draft' | 'sent' | 'approved' | 'revision_requested' | 'content_submitted'
  ai_generated: boolean
  sent_at?: string | null
  approved_at?: string | null
  created_at: string
  updated_at: string
}

export interface ProductMention {
  product_name: string
  key_benefit: string
  mention_timing: 'early' | 'middle' | 'end' | 'natural'
  talking_point: string
}

export interface InfluencerStyleAnalysis {
  tone: 'energetic' | 'calm' | 'humorous' | 'educational' | 'casual' | 'professional'
  pacing: 'fast' | 'medium' | 'slow'
  common_hooks: string[]
  signature_phrases: string[]
  typical_format: string
  audience_engagement_style: string
}

// Helper types for common operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
