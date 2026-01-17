"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { cn } from "@/lib/utils"
import { ArrowUpDown, Calendar, TrendingUp } from "lucide-react"
import type { ContentPost, ContentMetrics } from "@/types/database"

// Chart theme for dark mode
const chartTheme = {
  background: "transparent",
  textColor: "#a1a1aa", // zinc-400
  gridColor: "#27272a", // zinc-800
  colors: {
    likes: "#22d3ee", // cyan-400
    comments: "#22c55e", // green-400
    shares: "#f59e0b", // amber-400
  },
}

export interface EngagementDataPoint {
  id: string
  title: string
  date: string
  likes: number
  comments: number
  shares: number
  total: number
}

type SortBy = "date" | "engagement"

interface EngagementChartProps {
  data: EngagementDataPoint[]
  isLoading?: boolean
  title?: string
  className?: string
  maxItems?: number
  showTopN?: number
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

function truncateTitle(title: string, maxLength: number = 20): string {
  if (title.length <= maxLength) return title
  return title.substring(0, maxLength) + "..."
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  const data = payload[0]?.payload as EngagementDataPoint | undefined
  if (!data) return null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg max-w-xs">
      <p className="text-sm font-medium text-white mb-1 line-clamp-2">
        {data.title}
      </p>
      <p className="text-xs text-zinc-500 mb-2">{data.date}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: chartTheme.colors.likes }}
            />
            <span className="text-xs text-zinc-400">Likes</span>
          </div>
          <span className="text-xs font-medium text-white">
            {formatNumber(data.likes)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: chartTheme.colors.comments }}
            />
            <span className="text-xs text-zinc-400">Comments</span>
          </div>
          <span className="text-xs font-medium text-white">
            {formatNumber(data.comments)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: chartTheme.colors.shares }}
            />
            <span className="text-xs text-zinc-400">Shares</span>
          </div>
          <span className="text-xs font-medium text-white">
            {formatNumber(data.shares)}
          </span>
        </div>
        <div className="border-t border-zinc-700 mt-2 pt-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-400">Total Engagement</span>
            <span className="text-xs font-medium text-violet-400">
              {formatNumber(data.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

export function EngagementChart({
  data,
  isLoading,
  title = "Engagement by Post",
  className,
  maxItems = 10,
  showTopN = 10,
}: EngagementChartProps) {
  const [sortBy, setSortBy] = useState<SortBy>("engagement")

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      if (sortBy === "engagement") {
        return b.total - a.total
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    return sorted.slice(0, showTopN)
  }, [data, sortBy, showTopN])

  const chartData = useMemo(() => {
    return sortedData.map((item, index) => ({
      ...item,
      displayTitle: truncateTitle(item.title, 15),
      index: index + 1,
    }))
  }, [sortedData])

  if (isLoading) {
    return <ChartSkeleton />
  }

  return (
    <Card className={cn("bg-zinc-900/50 border-zinc-800", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-white">
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortBy("engagement")}
              className={cn(
                "h-8 px-3 text-xs gap-1.5",
                sortBy === "engagement"
                  ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Top Engaged
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortBy("date")}
              className={cn(
                "h-8 px-3 text-xs gap-1.5",
                sortBy === "date"
                  ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              Recent
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: chartTheme.colors.likes }}
            />
            <span className="text-xs text-zinc-400">Likes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: chartTheme.colors.comments }}
            />
            <span className="text-xs text-zinc-400">Comments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: chartTheme.colors.shares }}
            />
            <span className="text-xs text-zinc-400">Shares</span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-zinc-500">No content data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartTheme.gridColor}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  stroke={chartTheme.textColor}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatNumber}
                />
                <YAxis
                  type="category"
                  dataKey="index"
                  stroke={chartTheme.textColor}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  tickFormatter={(value) => `#${value}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.05)" }} />
                <Bar
                  dataKey="likes"
                  stackId="engagement"
                  fill={chartTheme.colors.likes}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="comments"
                  stackId="engagement"
                  fill={chartTheme.colors.comments}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="shares"
                  stackId="engagement"
                  fill={chartTheme.colors.shares}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Transform ContentPost data to EngagementDataPoint format
export function transformContentToEngagement(
  content: Array<ContentPost & { metrics?: ContentMetrics | null }>
): EngagementDataPoint[] {
  return content
    .filter((post) => post.metrics)
    .map((post) => {
      const metrics = post.metrics!
      return {
        id: post.id,
        title: post.caption || `${post.post_type} - ${post.platform}`,
        date: post.posted_at || post.created_at,
        likes: metrics.likes || 0,
        comments: metrics.comments || 0,
        shares: metrics.shares || 0,
        total: (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0),
      }
    })
}

// Generate mock data for testing
export function generateMockEngagementData(count: number = 15): EngagementDataPoint[] {
  const titles = [
    "Summer Collection Launch",
    "Behind the Scenes",
    "Product Review",
    "Day in My Life",
    "Brand Partnership",
    "Tutorial: Morning Routine",
    "Q&A Session",
    "Unboxing Video",
    "Travel Vlog",
    "Fitness Challenge",
    "Cooking with Me",
    "Room Tour",
    "Get Ready With Me",
    "Haul Video",
    "Collaboration Post",
  ]

  return Array.from({ length: count }, (_, i) => {
    const baseLikes = Math.floor(Math.random() * 50000) + 5000
    const baseComments = Math.floor(baseLikes * (0.02 + Math.random() * 0.08))
    const baseShares = Math.floor(baseLikes * (0.01 + Math.random() * 0.05))

    return {
      id: `post-${i + 1}`,
      title: titles[i % titles.length],
      date: new Date(Date.now() - i * 86400000 * 3).toISOString().split("T")[0],
      likes: baseLikes,
      comments: baseComments,
      shares: baseShares,
      total: baseLikes + baseComments + baseShares,
    }
  })
}
