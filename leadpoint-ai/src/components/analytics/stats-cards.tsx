"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  FileText,
  Users,
  Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts"

// Chart theme for dark mode
const chartTheme = {
  background: "transparent",
  textColor: "#a1a1aa", // zinc-400
  gridColor: "#27272a", // zinc-800
  colors: ["#8b5cf6", "#22d3ee", "#22c55e", "#f59e0b", "#ef4444"],
}

export interface StatCardData {
  title: string
  value: number
  previousValue?: number
  format?: "number" | "percentage" | "currency"
  icon: "reach" | "engagement" | "content" | "influencers"
  sparklineData?: number[]
  onClick?: () => void
}

interface StatsCardsProps {
  stats: StatCardData[]
  isLoading?: boolean
  className?: string
}

const iconMap = {
  reach: Eye,
  engagement: Heart,
  content: FileText,
  influencers: Users,
}

const colorMap = {
  reach: "text-violet-400",
  engagement: "text-cyan-400",
  content: "text-green-400",
  influencers: "text-amber-400",
}

const sparklineColorMap = {
  reach: chartTheme.colors[0],
  engagement: chartTheme.colors[1],
  content: chartTheme.colors[2],
  influencers: chartTheme.colors[3],
}

function formatValue(value: number, format: StatCardData["format"]): string {
  switch (format) {
    case "percentage":
      return `${value.toFixed(1)}%`
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    case "number":
    default:
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`
      }
      return value.toLocaleString()
  }
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function StatCard({ stat }: { stat: StatCardData }) {
  const Icon = iconMap[stat.icon]
  const iconColor = colorMap[stat.icon]
  const sparklineColor = sparklineColorMap[stat.icon]

  const change = useMemo(() => {
    if (stat.previousValue === undefined) return null
    return calculateChange(stat.value, stat.previousValue)
  }, [stat.value, stat.previousValue])

  const sparklineChartData = useMemo(() => {
    if (!stat.sparklineData) return null
    return stat.sparklineData.map((value, index) => ({ value, index }))
  }, [stat.sparklineData])

  const isPositive = change !== null && change > 0
  const isNeutral = change !== null && change === 0
  const isNegative = change !== null && change < 0

  return (
    <Card
      className={cn(
        "bg-zinc-900/50 backdrop-blur-sm",
        "border border-cyan-500/20",
        "shadow-[0_0_15px_rgba(0,212,255,0.08)]",
        "hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,212,255,0.12)]",
        "transition-all duration-300",
        stat.onClick && "cursor-pointer"
      )}
      onClick={stat.onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn("h-4 w-4", iconColor)} />
              <span className="text-sm text-zinc-400">{stat.title}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-white">
                {formatValue(stat.value, stat.format)}
              </span>
              {change !== null && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium",
                    isPositive && "text-green-400",
                    isNegative && "text-red-400",
                    isNeutral && "text-zinc-400"
                  )}
                >
                  {isPositive && <TrendingUp className="h-3 w-3" />}
                  {isNegative && <TrendingDown className="h-3 w-3" />}
                  {isNeutral && <Minus className="h-3 w-3" />}
                  <span>
                    {isPositive && "+"}
                    {change.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sparkline Mini Chart */}
          {sparklineChartData && (
            <div className="w-20 h-10 ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineChartData}>
                  <defs>
                    <linearGradient
                      id={`sparkline-gradient-${stat.icon}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={sparklineColor}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={sparklineColor}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={sparklineColor}
                    strokeWidth={1.5}
                    fill={`url(#sparkline-gradient-${stat.icon})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-baseline gap-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
          <Skeleton className="w-20 h-10 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsCards({ stats, isLoading, className }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {stats.map((stat, index) => (
        <StatCard key={index} stat={stat} />
      ))}
    </div>
  )
}

// Pre-configured stat card sets for common use cases
export function createCampaignStats(data: {
  totalReach: number
  previousReach?: number
  reachSparkline?: number[]
  totalEngagement: number
  previousEngagement?: number
  engagementSparkline?: number[]
  contentPosts: number
  previousPosts?: number
  postsSparkline?: number[]
  activeInfluencers: number
  previousInfluencers?: number
  influencersSparkline?: number[]
}): StatCardData[] {
  return [
    {
      title: "Total Reach",
      value: data.totalReach,
      previousValue: data.previousReach,
      icon: "reach",
      format: "number",
      sparklineData: data.reachSparkline,
    },
    {
      title: "Total Engagement",
      value: data.totalEngagement,
      previousValue: data.previousEngagement,
      icon: "engagement",
      format: "number",
      sparklineData: data.engagementSparkline,
    },
    {
      title: "Content Posts",
      value: data.contentPosts,
      previousValue: data.previousPosts,
      icon: "content",
      format: "number",
      sparklineData: data.postsSparkline,
    },
    {
      title: "Active Influencers",
      value: data.activeInfluencers,
      previousValue: data.previousInfluencers,
      icon: "influencers",
      format: "number",
      sparklineData: data.influencersSparkline,
    },
  ]
}
