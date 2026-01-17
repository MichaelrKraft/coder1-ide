"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calendar,
  RefreshCw,
  Download,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  FileText,
  Eye,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

import { StatsCards, createCampaignStats } from "@/components/analytics/stats-cards"
import {
  PerformanceChart,
  generateMockTimelineData,
  type TimelineDataPoint as ChartTimelineDataPoint,
} from "@/components/analytics/performance-chart"
// Engagement chart available but not currently used
// import { EngagementChart, generateMockEngagementData } from "@/components/analytics/engagement-chart"
import {
  InfluencerPerformance,
  generateMockInfluencerPerformance,
} from "@/components/analytics/influencer-performance"
import {
  PipelineFunnel,
  generateMockPipelineStats,
} from "@/components/analytics/pipeline-funnel"
import {
  useGlobalAnalytics,
  getDateRangeFromPreset,
  generateMockAnalyticsData,
  type DateRangePreset,
} from "@/hooks/use-analytics"
import { useCampaigns } from "@/hooks/use-campaigns"
import { cn } from "@/lib/utils"
import type { Platform } from "@/types/database"

// Chart theme for dark mode
const chartTheme = {
  background: "transparent",
  textColor: "#a1a1aa", // zinc-400
  gridColor: "#27272a", // zinc-800
  colors: ["#8b5cf6", "#22d3ee", "#22c55e", "#f59e0b", "#ef4444"],
}

// Platform colors
const platformColors: Record<Platform, string> = {
  instagram: "#E1306C",
  tiktok: "#00f2ea",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  linkedin: "#0077B5",
}

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

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

// Seeded random number generator for consistent SSR/client values
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

interface CampaignForComparison {
  id: string
  name: string
  status: string
}

// Campaign comparison card
function CampaignComparisonCard({
  campaigns,
  isLoading,
}: {
  campaigns: CampaignForComparison[]
  isLoading: boolean
}) {
  // Use seeded random based on campaign IDs for consistent SSR/client values
  const campaignData = useMemo(() => {
    return campaigns.slice(0, 5).map((campaign, index) => {
      // Create a seed from campaign id to ensure consistent values
      const seed = campaign.id ? campaign.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : index * 1000
      const random = seededRandom(seed)

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        reach: Math.floor(random() * 500000) + 50000,
        engagement: Math.floor(random() * 50000) + 5000,
        engagementRate: random() * 8 + 2,
        influencers: Math.floor(random() * 20) + 5,
        posts: Math.floor(random() * 30) + 5,
        trend: random() > 0.5 ? "up" as const : "down" as const,
        trendValue: random() * 30,
      }
    })
  }, [campaigns])

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white">
            Campaign Comparison
          </CardTitle>
          <Link href="/campaigns">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {campaignData.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}/analytics`}
              className="block"
            >
              <div className="flex items-center justify-between p-3 rounded-lg border border-cyan-500/20 bg-zinc-900/30 hover:border-cyan-500/30 hover:shadow-[0_0_10px_rgba(0,212,255,0.08)] transition-all duration-300">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {campaign.name}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-5",
                        campaign.status === "active"
                          ? "bg-green-500/10 text-green-400 border-green-500/30"
                          : campaign.status === "completed"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                      )}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-zinc-500">
                      {formatNumber(campaign.reach)} reach
                    </span>
                    <span className="text-xs text-zinc-500">
                      {campaign.engagementRate.toFixed(1)}% ER
                    </span>
                    <span className="text-xs text-zinc-500">
                      {campaign.influencers} influencers
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      campaign.trend === "up" ? "text-green-400" : "text-red-400"
                    )}
                  >
                    {campaign.trend === "up" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {campaign.trendValue.toFixed(1)}%
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Platform breakdown chart
function PlatformBreakdownChart({ isLoading }: { isLoading: boolean }) {
  // Mock platform data
  const platformData = [
    { name: "Instagram", value: 45, color: platformColors.instagram },
    { name: "TikTok", value: 30, color: platformColors.tiktok },
    { name: "YouTube", value: 15, color: platformColors.youtube },
    { name: "Twitter", value: 10, color: platformColors.twitter },
  ]

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-white">
          Platform Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {platformData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-zinc-400 text-sm">{value}</span>
                )}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-medium text-white">{data.name}</p>
                      <p className="text-xs text-zinc-400">{data.value}% of engagement</p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Weekly performance chart
function WeeklyPerformanceChart({ isLoading }: { isLoading: boolean }) {
  // Mock weekly data
  const weeklyData = [
    { day: "Mon", views: 12000, engagement: 1200 },
    { day: "Tue", views: 15000, engagement: 1500 },
    { day: "Wed", views: 18000, engagement: 1800 },
    { day: "Thu", views: 14000, engagement: 1400 },
    { day: "Fri", views: 20000, engagement: 2000 },
    { day: "Sat", views: 25000, engagement: 2500 },
    { day: "Sun", views: 22000, engagement: 2200 },
  ]

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-white">
          Weekly Performance Pattern
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartTheme.gridColor}
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke={chartTheme.textColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={chartTheme.textColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatNumber}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-medium text-white mb-2">{label}</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-zinc-400">Views</span>
                          <span className="text-xs font-medium text-white">
                            {formatNumber(payload[0]?.value as number)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-zinc-400">Engagement</span>
                          <span className="text-xs font-medium text-white">
                            {formatNumber(payload[1]?.value as number)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="views"
                fill={chartTheme.colors[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="engagement"
                fill={chartTheme.colors[1]}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartTheme.colors[0] }}
            />
            <span className="text-xs text-zinc-400">Views</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartTheme.colors[1] }}
            />
            <span className="text-xs text-zinc-400">Engagement</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function GlobalAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangePreset>("30d")
  const [isClient, setIsClient] = useState(false)
  const [mockData, setMockData] = useState<ReturnType<typeof generateMockAnalyticsData> | null>(null)

  // Only generate mock data on client to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)
    setMockData(generateMockAnalyticsData())
  }, [])

  // Get date range from preset
  const dateRangeFilter = useMemo(
    () => getDateRangeFromPreset(dateRange),
    [dateRange]
  )

  // Fetch global analytics data
  const { data, isLoading, isError, refetch } = useGlobalAnalytics(dateRangeFilter)

  // Fetch campaigns for comparison
  const { data: campaignsData, isLoading: campaignsLoading } = useCampaigns({
    pageSize: 10,
    sortBy: "updated_at",
    sortOrder: "desc",
  })

  // Use mock data for development/demo (only when on client)
  const analyticsData = data || mockData
  const campaigns = campaignsData?.data || []

  // Transform data for components
  const statsData = useMemo(() => {
    if (!analyticsData?.summary) return []

    const summary = analyticsData.summary
    const trends = analyticsData.trends

    // Generate sparkline data from timeline (use seeded random for consistency)
    const sparklineData = analyticsData.timeline?.slice(-7).map((d) => d.views) || []
    const engagementSparkline = analyticsData.timeline?.slice(-7).map((d) => d.engagement) || []

    // Use index-based values for sparklines instead of random
    const postsSparkline = analyticsData.timeline?.slice(-7).map((_, i) => 1 + (i % 5) + 1) || []
    const influencersSparkline = analyticsData.timeline?.slice(-7).map((_, i) => 5 + (i % 10) + 2) || []

    return createCampaignStats({
      totalReach: summary.total_reach,
      previousReach: summary.total_reach / (1 + (trends?.reach_change || 0) / 100),
      reachSparkline: sparklineData,
      totalEngagement: summary.total_engagement,
      previousEngagement: summary.total_engagement / (1 + (trends?.engagement_change || 0) / 100),
      engagementSparkline: engagementSparkline,
      contentPosts: summary.total_posts,
      previousPosts: summary.total_posts / (1 + (trends?.posts_change || 0) / 100),
      postsSparkline: postsSparkline,
      activeInfluencers: summary.active_influencers,
      previousInfluencers: summary.active_influencers / (1 + (trends?.influencers_change || 0) / 100),
      influencersSparkline: influencersSparkline,
    })
  }, [analyticsData])

  // Performance chart data - only generate mock on client
  const performanceData = useMemo(() => {
    if (analyticsData?.timeline) {
      return transformTimelineData(analyticsData.timeline)
    }
    // Only generate mock data on client to avoid hydration
    if (!isClient) return []
    return generateMockTimelineData(dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90)
  }, [analyticsData, dateRange, isClient])

  // Pipeline funnel data - only generate mock on client
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
    // Return static defaults during SSR to avoid hydration mismatch
    if (!isClient) {
      return {
        discovered: 0,
        contacted: 0,
        responded: 0,
        negotiating: 0,
        confirmed: 0,
        posted: 0,
        completed: 0,
      }
    }
    return generateMockPipelineStats()
  }, [analyticsData, isClient])

  // Top influencers data - use seeded random for consistent values
  const influencerData = useMemo(() => {
    if (analyticsData?.top_influencers && analyticsData.top_influencers.length > 0) {
      return analyticsData.top_influencers.map((inf, index) => {
        // Create seed from influencer id for consistent values
        const seed = inf.influencer.id ? inf.influencer.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : index * 1000
        const random = seededRandom(seed)

        return {
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
          roi: random() * 300 - 50,
          viewsHistory: Array.from({ length: 7 }, (_, i) => {
            const r = seededRandom(seed + i)
            return Math.floor(r() * 100000) + 10000
          }),
        }
      })
    }
    // Only generate mock data on client to avoid hydration
    if (!isClient) return []
    return generateMockInfluencerPerformance(10)
  }, [analyticsData, isClient])

  // Only show error if there's no mock data to fall back to
  if (isError && !mockData) {
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
          <h1 className="text-2xl font-semibold text-white">Analytics Overview</h1>
          <p className="text-zinc-400 mt-1">
            Track performance metrics across all your campaigns
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
        title="Overall Performance"
        defaultDateRange={dateRange}
        chartType="area"
        showLegend={true}
      />

      {/* Two Column: Platform Distribution + Weekly Pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlatformBreakdownChart isLoading={isLoading} />
        <WeeklyPerformanceChart isLoading={isLoading} />
      </div>

      {/* Campaign Comparison */}
      <CampaignComparisonCard
        campaigns={campaigns}
        isLoading={isLoading || campaignsLoading}
      />

      {/* Pipeline Funnel */}
      <PipelineFunnel
        data={pipelineData}
        isLoading={isLoading}
        title="Global Pipeline Overview"
        showConversionRates={true}
        variant="horizontal"
      />

      {/* Top Influencers */}
      <InfluencerPerformance
        data={influencerData}
        isLoading={isLoading}
        title="Top Performing Influencers (All Campaigns)"
        showTopPerformers={true}
        maxItems={10}
      />

      {/* Summary Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                <Eye className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Total Views</p>
                <p className="text-lg font-semibold text-white">
                  {formatNumber(analyticsData?.summary?.total_views || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                <BarChart3 className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Avg Engagement Rate</p>
                <p className="text-lg font-semibold text-white">
                  {(analyticsData?.summary?.avg_engagement_rate || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                <FileText className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Content Published</p>
                <p className="text-lg font-semibold text-white">
                  {analyticsData?.summary?.total_posts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                <Users className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Total Influencers</p>
                <p className="text-lg font-semibold text-white">
                  {analyticsData?.summary?.active_influencers || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
