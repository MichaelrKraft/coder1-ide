"use client"

import { useQuery } from "@tanstack/react-query"
import type { ApiResponse } from "@/types/api"
import type {
  AnalyticsData,
  AnalyticsSummary,
  AnalyticsTrends,
  TimelineDataPoint,
  TopContent,
  TopInfluencer,
  PipelineStats,
} from "@/app/api/analytics/route"

// Re-export types for convenience
export type {
  AnalyticsData,
  AnalyticsSummary,
  AnalyticsTrends,
  TimelineDataPoint,
  TopContent,
  TopInfluencer,
  PipelineStats,
}

const ANALYTICS_KEY = "analytics"

// Types for hook parameters
export interface AnalyticsParams {
  campaignId?: string
  dateFrom?: string
  dateTo?: string
}

export interface DateRange {
  start: Date
  end: Date
}

// Fetch analytics data
async function fetchAnalytics(params?: AnalyticsParams): Promise<AnalyticsData> {
  const searchParams = new URLSearchParams()

  if (params?.campaignId) {
    searchParams.set("campaign_id", params.campaignId)
  }
  if (params?.dateFrom) {
    searchParams.set("date_from", params.dateFrom)
  }
  if (params?.dateTo) {
    searchParams.set("date_to", params.dateTo)
  }

  const response = await fetch(`/api/analytics?${searchParams.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to fetch analytics")
  }

  const result: ApiResponse<AnalyticsData> = await response.json()

  if (result.error) {
    throw new Error(result.error.message)
  }

  if (!result.data) {
    throw new Error("No analytics data returned")
  }

  return result.data
}

/**
 * Hook to fetch analytics data with optional filters
 *
 * @param params - Optional filter parameters (campaignId, dateFrom, dateTo)
 * @returns Query result with analytics data
 *
 * @example
 * // Fetch global analytics
 * const { data, isLoading } = useAnalytics()
 *
 * @example
 * // Fetch analytics for a specific campaign
 * const { data, isLoading } = useAnalytics({ campaignId: 'campaign-123' })
 *
 * @example
 * // Fetch analytics with date range
 * const { data, isLoading } = useAnalytics({
 *   dateFrom: '2024-01-01',
 *   dateTo: '2024-01-31'
 * })
 */
export function useAnalytics(params?: AnalyticsParams) {
  return useQuery({
    queryKey: [ANALYTICS_KEY, params],
    queryFn: () => fetchAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

/**
 * Hook to fetch analytics for a specific campaign
 *
 * @param campaignId - The campaign ID to fetch analytics for
 * @param dateRange - Optional date range filter
 * @returns Query result with campaign analytics data
 *
 * @example
 * const { data, isLoading } = useCampaignAnalytics('campaign-123')
 *
 * @example
 * const { data, isLoading } = useCampaignAnalytics('campaign-123', {
 *   start: new Date('2024-01-01'),
 *   end: new Date('2024-01-31')
 * })
 */
export function useCampaignAnalytics(campaignId: string, dateRange?: DateRange) {
  const params: AnalyticsParams = {
    campaignId,
  }

  if (dateRange) {
    params.dateFrom = dateRange.start.toISOString().split("T")[0]
    params.dateTo = dateRange.end.toISOString().split("T")[0]
  }

  return useQuery({
    queryKey: [ANALYTICS_KEY, "campaign", campaignId, dateRange],
    queryFn: () => fetchAnalytics(params),
    enabled: !!campaignId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch global analytics (all campaigns)
 *
 * @param dateRange - Optional date range filter
 * @returns Query result with global analytics data
 */
export function useGlobalAnalytics(dateRange?: DateRange) {
  const params: AnalyticsParams = {}

  if (dateRange) {
    params.dateFrom = dateRange.start.toISOString().split("T")[0]
    params.dateTo = dateRange.end.toISOString().split("T")[0]
  }

  return useQuery({
    queryKey: [ANALYTICS_KEY, "global", dateRange],
    queryFn: () => fetchAnalytics(params),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

// Helper hooks for specific analytics data

/**
 * Hook to get only the summary metrics
 */
export function useAnalyticsSummary(params?: AnalyticsParams) {
  const query = useAnalytics(params)

  return {
    ...query,
    data: query.data?.summary,
  }
}

/**
 * Hook to get only the timeline data
 */
export function useAnalyticsTimeline(params?: AnalyticsParams) {
  const query = useAnalytics(params)

  return {
    ...query,
    data: query.data?.timeline,
  }
}

/**
 * Hook to get only the pipeline stats
 */
export function useAnalyticsPipeline(params?: AnalyticsParams) {
  const query = useAnalytics(params)

  return {
    ...query,
    data: query.data?.pipeline_stats,
  }
}

/**
 * Hook to get only the top performers
 */
export function useTopPerformers(params?: AnalyticsParams) {
  const query = useAnalytics(params)

  return {
    ...query,
    data: {
      topContent: query.data?.top_content,
      topInfluencers: query.data?.top_influencers,
    },
  }
}

// Date range presets
export type DateRangePreset = "7d" | "30d" | "90d" | "custom"

/**
 * Get a date range from a preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset): DateRange | undefined {
  if (preset === "custom") return undefined

  const now = new Date()
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90

  return {
    start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    end: now,
  }
}

// Mock data generators for development/testing

/**
 * Generate mock analytics data for testing
 */
export function generateMockAnalyticsData(): AnalyticsData {
  const now = new Date()
  const days = 30

  // Generate timeline
  const timeline: TimelineDataPoint[] = []
  for (let i = days; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const baseViews = 10000 + Math.random() * 5000
    const baseLikes = baseViews * (0.05 + Math.random() * 0.05)
    const baseComments = baseLikes * (0.1 + Math.random() * 0.1)
    const baseShares = baseLikes * (0.05 + Math.random() * 0.05)

    // Add weekend boost
    const dayOfWeek = date.getDay()
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1

    timeline.push({
      date: date.toISOString().split("T")[0],
      views: Math.round(baseViews * weekendMultiplier),
      likes: Math.round(baseLikes * weekendMultiplier),
      comments: Math.round(baseComments * weekendMultiplier),
      shares: Math.round(baseShares * weekendMultiplier),
      reach: Math.round(baseViews * 0.8 * weekendMultiplier),
      engagement: Math.round((baseLikes + baseComments + baseShares) * weekendMultiplier),
    })
  }

  // Calculate totals from timeline
  const totals = timeline.reduce(
    (acc, day) => ({
      views: acc.views + day.views,
      likes: acc.likes + day.likes,
      comments: acc.comments + day.comments,
      shares: acc.shares + day.shares,
      reach: acc.reach + day.reach,
      engagement: acc.engagement + day.engagement,
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, reach: 0, engagement: 0 }
  )

  // Generate pipeline stats
  const discovered = Math.floor(Math.random() * 500) + 200
  const contacted = Math.floor(discovered * (0.4 + Math.random() * 0.3))
  const responded = Math.floor(contacted * (0.3 + Math.random() * 0.3))
  const negotiating = Math.floor(responded * (0.4 + Math.random() * 0.3))
  const confirmed = Math.floor(negotiating * (0.5 + Math.random() * 0.3))
  const posted = Math.floor(confirmed * (0.6 + Math.random() * 0.3))
  const completed = Math.floor(posted * 0.8)

  return {
    summary: {
      total_reach: totals.reach,
      total_engagement: totals.engagement,
      total_posts: Math.floor(Math.random() * 50) + 20,
      active_influencers: Math.floor(Math.random() * 30) + 10,
      avg_engagement_rate: totals.views > 0 ? (totals.engagement / totals.views) * 100 : 0,
      total_views: totals.views,
      total_likes: totals.likes,
      total_comments: totals.comments,
      total_shares: totals.shares,
    },
    trends: {
      reach_change: Math.random() * 40 - 10,
      engagement_change: Math.random() * 40 - 10,
      posts_change: Math.random() * 40 - 10,
      influencers_change: Math.random() * 40 - 10,
    },
    timeline,
    top_content: [],
    top_influencers: [],
    pipeline_stats: {
      discovered,
      contacted,
      responded,
      negotiating,
      confirmed,
      posted,
      completed,
      conversion_rates: {
        discovered_to_contacted: contacted / discovered * 100,
        contacted_to_responded: responded / contacted * 100,
        responded_to_confirmed: confirmed / responded * 100,
        confirmed_to_posted: posted / confirmed * 100,
      },
    },
  }
}
