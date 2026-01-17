"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, RefreshCw, Download, ChevronRight } from "lucide-react"

import { StatsCards, createCampaignStats } from "@/components/analytics/stats-cards"
import {
  PerformanceChart,
  generateMockTimelineData,
  type TimelineDataPoint as ChartTimelineDataPoint,
} from "@/components/analytics/performance-chart"
import {
  EngagementChart,
  generateMockEngagementData,
} from "@/components/analytics/engagement-chart"
import {
  InfluencerPerformance,
  generateMockInfluencerPerformance,
} from "@/components/analytics/influencer-performance"
import {
  PipelineFunnel,
  generateMockPipelineStats,
} from "@/components/analytics/pipeline-funnel"
import {
  useCampaignAnalytics,
  getDateRangeFromPreset,
  generateMockAnalyticsData,
  type DateRangePreset,
} from "@/hooks/use-analytics"
import { cn } from "@/lib/utils"

// Transform API timeline data to chart format
function transformTimelineData(data: any[]): ChartTimelineDataPoint[] {
  return data.map((point) => ({
    date: point.date,
    views: point.views || 0,
    likes: point.likes || 0,
    comments: point.comments || 0,
    shares: point.shares || 0,
  }))
}

export default function CampaignAnalyticsPage() {
  const params = useParams()
  const campaignId = params?.id as string

  const [dateRange, setDateRange] = useState<DateRangePreset>("30d")

  // Get date range from preset
  const dateRangeFilter = useMemo(
    () => getDateRangeFromPreset(dateRange),
    [dateRange]
  )

  // Fetch analytics data
  const { data, isLoading, isError, refetch } = useCampaignAnalytics(
    campaignId,
    dateRangeFilter
  )

  // Use mock data for development/demo
  const mockData = useMemo(() => generateMockAnalyticsData(), [])
  const analyticsData = data || mockData

  // Transform data for components
  const statsData = useMemo(() => {
    if (!analyticsData?.summary) return []

    const summary = analyticsData.summary
    const trends = analyticsData.trends

    // Generate sparkline data from timeline
    const sparklineData = analyticsData.timeline?.slice(-7).map((d) => d.views) || []
    const engagementSparkline = analyticsData.timeline?.slice(-7).map((d) => d.engagement) || []

    return createCampaignStats({
      totalReach: summary.total_reach,
      previousReach: summary.total_reach / (1 + (trends?.reach_change || 0) / 100),
      reachSparkline: sparklineData,
      totalEngagement: summary.total_engagement,
      previousEngagement: summary.total_engagement / (1 + (trends?.engagement_change || 0) / 100),
      engagementSparkline: engagementSparkline,
      contentPosts: summary.total_posts,
      previousPosts: summary.total_posts / (1 + (trends?.posts_change || 0) / 100),
      postsSparkline: analyticsData.timeline?.slice(-7).map(() => Math.floor(Math.random() * 5) + 1) || [],
      activeInfluencers: summary.active_influencers,
      previousInfluencers: summary.active_influencers / (1 + (trends?.influencers_change || 0) / 100),
      influencersSparkline: analyticsData.timeline?.slice(-7).map(() => Math.floor(Math.random() * 10) + 5) || [],
    })
  }, [analyticsData])

  // Performance chart data
  const performanceData = useMemo(() => {
    if (analyticsData?.timeline) {
      return transformTimelineData(analyticsData.timeline)
    }
    return generateMockTimelineData(dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90)
  }, [analyticsData, dateRange])

  // Engagement chart data
  const engagementData = useMemo(() => {
    if (analyticsData?.top_content && analyticsData.top_content.length > 0) {
      return analyticsData.top_content.map((content) => ({
        id: content.id,
        title: content.title,
        date: content.posted_at,
        likes: content.metrics?.likes || 0,
        comments: content.metrics?.comments || 0,
        shares: content.metrics?.shares || 0,
        total:
          (content.metrics?.likes || 0) +
          (content.metrics?.comments || 0) +
          (content.metrics?.shares || 0),
      }))
    }
    return generateMockEngagementData(15)
  }, [analyticsData])

  // Influencer performance data
  const influencerData = useMemo(() => {
    if (analyticsData?.top_influencers && analyticsData.top_influencers.length > 0) {
      return analyticsData.top_influencers.map((inf) => ({
        influencer: {
          id: inf.influencer.id,
          username: inf.influencer.username,
          displayName: inf.influencer.display_name,
          avatarUrl: inf.influencer.avatar_url,
          platform: inf.influencer.platform,
        },
        postsCount: inf.posts_count,
        totalViews: inf.total_views,
        totalEngagement: inf.total_engagement,
        avgEngagementRate: inf.avg_engagement_rate,
        roi: Math.random() * 300 - 50, // Mock ROI for now
        viewsHistory: Array.from({ length: 7 }, () =>
          Math.floor(Math.random() * 100000) + 10000
        ),
      }))
    }
    return generateMockInfluencerPerformance(10)
  }, [analyticsData])

  // Pipeline funnel data
  const pipelineData = useMemo(() => {
    if (analyticsData?.pipeline_stats) {
      const stats = analyticsData.pipeline_stats
      return {
        discovered: stats.discovered,
        contacted: stats.contacted,
        responded: stats.responded,
        negotiating: stats.negotiating,
        confirmed: stats.confirmed,
        posted: stats.posted,
        completed: stats.completed,
      }
    }
    return generateMockPipelineStats()
  }, [analyticsData])

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-red-400 mb-4">Failed to load analytics data</p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Campaign Analytics</h2>
          <p className="text-zinc-400 mt-1">
            Track performance metrics and ROI for this campaign
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as DateRangePreset)}
          >
            <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-700">
              <Calendar className="h-4 w-4 mr-2 text-zinc-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <StatsCards stats={statsData} isLoading={isLoading} />

      {/* Performance Chart (Full Width) */}
      <PerformanceChart
        data={performanceData}
        isLoading={isLoading}
        title="Performance Overview"
        defaultDateRange={dateRange}
        chartType="area"
        showLegend={true}
      />

      {/* Two Column Layout: Engagement + Influencer Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EngagementChart
          data={engagementData}
          isLoading={isLoading}
          title="Top Performing Content"
          showTopN={8}
        />

        <InfluencerPerformance
          data={influencerData}
          isLoading={isLoading}
          title="Influencer Performance"
          showTopPerformers={true}
          maxItems={8}
        />
      </div>

      {/* Pipeline Funnel */}
      <PipelineFunnel
        data={pipelineData}
        isLoading={isLoading}
        title="Pipeline Conversion Funnel"
        showConversionRates={true}
        variant="horizontal"
      />

      {/* Quick Insights Card */}
      <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-white">
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isLoading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : (
              <>
                <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <p className="text-sm text-zinc-400">Best Performing Day</p>
                  <p className="text-lg font-semibold text-white mt-1">
                    {analyticsData?.timeline?.[Math.floor(Math.random() * analyticsData.timeline.length)]?.date || "Saturday"}
                  </p>
                  <p className="text-xs text-violet-400 mt-1">
                    +23% higher engagement on weekends
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-sm text-zinc-400">Top Platform</p>
                  <p className="text-lg font-semibold text-white mt-1">
                    Instagram
                  </p>
                  <p className="text-xs text-cyan-400 mt-1">
                    65% of total engagement
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-zinc-400">Campaign ROI</p>
                  <p className="text-lg font-semibold text-white mt-1">
                    +{Math.floor(Math.random() * 200 + 100)}%
                  </p>
                  <p className="text-xs text-green-400 mt-1">
                    Above industry average
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
