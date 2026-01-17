/**
 * API Request/Response types for LeadPoint.ai
 * Used for type-safe API calls and responses
 */

import type {
  Platform,
  PipelineStage,
  InfluencerScore,
  Campaign,
  Influencer,
  CampaignInfluencer,
  OutreachMessage,
  TargetAudience,
  BudgetRange,
  CampaignGoals,
  AIAnalysis,
} from './database'

// ============================================================================
// Common Types
// ============================================================================

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  status: number
}

export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// Discovery API Types
// ============================================================================

export interface DiscoveryFilters {
  platforms?: Platform[]
  followerRange?: {
    min?: number
    max?: number
  }
  engagementRateMin?: number
  categories?: string[]
  locations?: string[]
  languages?: string[]
  keywords?: string[]
  excludeIds?: string[]
}

export interface DiscoveryRequest {
  query: string
  filters?: DiscoveryFilters
  targetAudience?: TargetAudience
  campaignId?: string
  limit?: number
  useAI?: boolean
}

export interface DiscoveredInfluencer {
  id: string
  platform: Platform
  username: string
  displayName: string
  profileUrl: string
  avatarUrl: string | null
  bio: string | null
  followerCount: number
  engagementRate: number | null
  categories: string[]
  location: string | null
  score: InfluencerScore
  matchReasons: string[]
  alreadyInCampaign?: boolean
}

export interface DiscoveryResponse {
  influencers: DiscoveredInfluencer[]
  total: number
  creditsUsed: number
  creditsRemaining: number
  searchId: string
  filters: DiscoveryFilters
}

// ============================================================================
// Outreach API Types
// ============================================================================

export interface OutreachGenerateRequest {
  campaignInfluencerId: string
  messageType: 'initial' | 'followup' | 'negotiation' | 'contract' | 'custom'
  tone?: 'professional' | 'casual' | 'friendly' | 'enthusiastic'
  customInstructions?: string
  includeSubject?: boolean
  maxLength?: number
  brandGuidelines?: string
  previousMessages?: Array<{
    body: string
    sentAt: string
  }>
}

export interface OutreachGenerateResponse {
  subject: string | null
  body: string
  personalizationUsed: string[]
  suggestedFollowUpDate: string | null
  creditsUsed: number
  creditsRemaining: number
}

export interface OutreachSendRequest {
  messageId: string
  scheduledFor?: string
}

export interface OutreachSendResponse {
  success: boolean
  sentAt: string
  trackingId: string
}

export interface OutreachTemplateRequest {
  name: string
  messageType: 'initial' | 'followup' | 'negotiation' | 'contract'
  subject?: string
  body: string
  variables: string[]
}

export interface OutreachTemplate {
  id: string
  organizationId: string
  name: string
  messageType: string
  subject: string | null
  body: string
  variables: string[]
  usageCount: number
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Campaign API Types
// ============================================================================

export interface CampaignCreateRequest {
  name: string
  description?: string
  goals?: CampaignGoals
  targetAudience?: TargetAudience
  budgetRange?: BudgetRange
  startDate?: string
  endDate?: string
}

export interface CampaignUpdateRequest {
  name?: string
  description?: string
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  goals?: CampaignGoals
  targetAudience?: TargetAudience
  budgetRange?: BudgetRange
  startDate?: string
  endDate?: string
}

export interface CampaignResponse extends Campaign {
  stats: CampaignStats
  recentActivity: CampaignActivity[]
}

export interface CampaignStats {
  totalInfluencers: number
  byStage: Record<PipelineStage, number>
  totalReach: number
  totalEngagement: number
  totalSpend: number
  averageEngagementRate: number
  messagessSent: number
  responseRate: number
  postsPublished: number
}

export interface CampaignActivity {
  id: string
  type: 'influencer_added' | 'stage_changed' | 'message_sent' | 'message_replied' | 'content_posted'
  description: string
  influencerId?: string
  influencerName?: string
  createdAt: string
}

// ============================================================================
// Influencer API Types
// ============================================================================

export interface InfluencerAddRequest {
  campaignId: string
  influencerId?: string
  platform?: Platform
  username?: string
  profileUrl?: string
  notes?: string
}

export interface InfluencerUpdateRequest {
  stage?: PipelineStage
  notes?: string
  contractValue?: number
  contractCurrency?: string
  deliverables?: Array<{
    type: 'post' | 'story' | 'reel' | 'video' | 'live' | 'article'
    quantity: number
    description?: string
    dueDate?: string
  }>
}

export interface InfluencerDetailResponse extends Influencer {
  campaigns: Array<{
    id: string
    name: string
    stage: PipelineStage
    addedAt: string
  }>
  outreachHistory: OutreachMessage[]
  contentPosts: Array<{
    id: string
    campaignId: string
    campaignName: string
    postUrl: string
    postedAt: string
    metrics: {
      views?: number
      likes?: number
      comments?: number
      engagementRate?: number
    }
  }>
}

export interface InfluencerAnalyzeRequest {
  influencerId: string
  forceRefresh?: boolean
}

export interface InfluencerAnalyzeResponse {
  influencerId: string
  analysis: AIAnalysis
  creditsUsed: number
  creditsRemaining: number
}

// ============================================================================
// Pipeline API Types
// ============================================================================

export interface PipelineMoveRequest {
  campaignInfluencerId: string
  toStage: PipelineStage
  notes?: string
}

export interface PipelineBulkMoveRequest {
  campaignInfluencerIds: string[]
  toStage: PipelineStage
  notes?: string
}

export interface PipelineResponse {
  stages: Array<{
    stage: PipelineStage
    count: number
    influencers: Array<CampaignInfluencer & {
      influencer: Pick<Influencer, 'id' | 'username' | 'display_name' | 'avatar_url' | 'platform' | 'follower_count' | 'engagement_rate'>
      lastMessage?: {
        sentAt: string
        status: string
      } | null
    }>
  }>
}

// ============================================================================
// Analytics API Types
// ============================================================================

export interface AnalyticsRequest {
  campaignId?: string
  dateRange?: {
    start: string
    end: string
  }
  metrics?: string[]
  groupBy?: 'day' | 'week' | 'month'
}

export interface AnalyticsResponse {
  summary: {
    totalReach: number
    totalEngagement: number
    totalConversions: number
    totalSpend: number
    roi: number
    averageEngagementRate: number
  }
  timeSeries: Array<{
    date: string
    reach: number
    engagement: number
    conversions: number
    spend: number
  }>
  topPerformers: Array<{
    influencerId: string
    influencerName: string
    platform: Platform
    reach: number
    engagement: number
    engagementRate: number
    contentCount: number
  }>
  platformBreakdown: Array<{
    platform: Platform
    reach: number
    engagement: number
    influencerCount: number
    averageEngagementRate: number
  }>
}

// ============================================================================
// Auth API Types
// ============================================================================

export interface SignUpRequest {
  email: string
  password: string
  fullName: string
  organizationName?: string
}

export interface SignInRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    fullName: string | null
  }
  organization: {
    id: string
    name: string
    slug: string
    subscriptionPlan: string
  } | null
}

export interface InviteMemberRequest {
  email: string
  role: 'admin' | 'member'
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookEvent {
  id: string
  type: string
  data: Record<string, unknown>
  createdAt: string
}

export interface StripeWebhookEvent {
  type: 'checkout.session.completed' | 'customer.subscription.updated' | 'customer.subscription.deleted' | 'invoice.payment_failed'
  data: {
    object: Record<string, unknown>
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'status' in error
  )
}

export function isPaginatedResponse<T>(
  response: unknown
): response is PaginatedResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    'pagination' in response &&
    Array.isArray((response as PaginatedResponse<T>).data)
  )
}
