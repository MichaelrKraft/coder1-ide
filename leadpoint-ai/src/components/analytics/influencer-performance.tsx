"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Trophy,
  Star,
  TrendingUp,
} from "lucide-react"
import type { Influencer, Platform } from "@/types/database"

// Chart theme for dark mode
const chartTheme = {
  colors: {
    bar: "#8b5cf6", // violet-500
    barLight: "#a78bfa", // violet-400
  },
}

export interface InfluencerPerformanceData {
  influencer: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    platform: Platform
  }
  postsCount: number
  totalViews: number
  totalEngagement: number
  avgEngagementRate: number
  roi: number
  contractValue?: number
  viewsHistory?: number[]
}

type SortField = "views" | "engagement" | "posts" | "roi" | "engagementRate"
type SortDirection = "asc" | "desc"

interface InfluencerPerformanceProps {
  data: InfluencerPerformanceData[]
  isLoading?: boolean
  title?: string
  className?: string
  showTopPerformers?: boolean
  maxItems?: number
}

const platformColors: Record<Platform, string> = {
  instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  tiktok: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  youtube: "bg-red-500/20 text-red-400 border-red-500/30",
  twitter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  linkedin: "bg-blue-600/20 text-blue-400 border-blue-600/30",
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

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

function formatROI(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function MiniBarChart({ data }: { data: number[] }) {
  if (!data || data.length === 0) return null

  const chartData = data.map((value, index) => ({ value, index }))

  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap="20%">
          <Bar
            dataKey="value"
            fill={chartTheme.colors.bar}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SortButton({
  field,
  currentField,
  direction,
  onClick,
  children,
}: {
  field: SortField
  currentField: SortField
  direction: SortDirection
  onClick: () => void
  children: React.ReactNode
}) {
  const isActive = field === currentField

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-auto p-0 font-medium hover:bg-transparent",
        isActive ? "text-violet-400" : "text-zinc-400 hover:text-white"
      )}
    >
      {children}
      {isActive && (
        direction === "asc" ? (
          <ChevronUp className="ml-1 h-3 w-3" />
        ) : (
          <ChevronDown className="ml-1 h-3 w-3" />
        )
      )}
    </Button>
  )
}

function TableSkeleton() {
  return (
    <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function InfluencerPerformance({
  data,
  isLoading,
  title = "Influencer Performance",
  className,
  showTopPerformers = true,
  maxItems = 10,
}: InfluencerPerformanceProps) {
  const [sortField, setSortField] = useState<SortField>("views")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aValue: number
      let bValue: number

      switch (sortField) {
        case "views":
          aValue = a.totalViews
          bValue = b.totalViews
          break
        case "engagement":
          aValue = a.totalEngagement
          bValue = b.totalEngagement
          break
        case "posts":
          aValue = a.postsCount
          bValue = b.postsCount
          break
        case "roi":
          aValue = a.roi
          bValue = b.roi
          break
        case "engagementRate":
          aValue = a.avgEngagementRate
          bValue = b.avgEngagementRate
          break
        default:
          return 0
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    })

    return sorted.slice(0, maxItems)
  }, [data, sortField, sortDirection, maxItems])

  const topPerformers = useMemo(() => {
    if (!showTopPerformers) return []
    return [...data]
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 3)
  }, [data, showTopPerformers])

  if (isLoading) {
    return <TableSkeleton />
  }

  return (
    <Card className={cn("bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-white">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Top Performers Highlight */}
        {showTopPerformers && topPerformers.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-zinc-300">
                Top Performers
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topPerformers.map((performer, index) => (
                <div
                  key={performer.influencer.id}
                  className={cn(
                    "relative p-3 rounded-lg border",
                    index === 0
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-zinc-800/50 border-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={performer.influencer.avatarUrl || undefined}
                          alt={performer.influencer.displayName}
                        />
                        <AvatarFallback className="bg-zinc-700 text-white">
                          {performer.influencer.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                          <Star className="h-3 w-3 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        @{performer.influencer.username}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {formatNumber(performer.totalEngagement)} engagement
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Influencer</TableHead>
                <TableHead className="text-right">
                  <SortButton
                    field="posts"
                    currentField={sortField}
                    direction={sortDirection}
                    onClick={() => handleSort("posts")}
                  >
                    Posts
                  </SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton
                    field="views"
                    currentField={sortField}
                    direction={sortDirection}
                    onClick={() => handleSort("views")}
                  >
                    Total Views
                  </SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton
                    field="engagementRate"
                    currentField={sortField}
                    direction={sortDirection}
                    onClick={() => handleSort("engagementRate")}
                  >
                    Avg ER
                  </SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton
                    field="roi"
                    currentField={sortField}
                    direction={sortDirection}
                    onClick={() => handleSort("roi")}
                  >
                    ROI
                  </SortButton>
                </TableHead>
                <TableHead className="w-20">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-zinc-500"
                  >
                    No influencer data available
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((item) => (
                  <TableRow
                    key={item.influencer.id}
                    className="border-zinc-800 hover:bg-zinc-800/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={item.influencer.avatarUrl || undefined}
                            alt={item.influencer.displayName}
                          />
                          <AvatarFallback className="bg-zinc-700 text-white text-xs">
                            {item.influencer.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-white">
                            @{item.influencer.username}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] h-4 px-1",
                              platformColors[item.influencer.platform]
                            )}
                          >
                            {item.influencer.platform}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-zinc-300">
                      {item.postsCount}
                    </TableCell>
                    <TableCell className="text-right text-sm text-zinc-300">
                      {formatNumber(item.totalViews)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-zinc-300">
                      {formatPercentage(item.avgEngagementRate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          item.roi >= 0 ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {formatROI(item.roi)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.viewsHistory && (
                        <MiniBarChart data={item.viewsHistory} />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// Generate mock data for testing
export function generateMockInfluencerPerformance(
  count: number = 10
): InfluencerPerformanceData[] {
  const platforms: Platform[] = ["instagram", "tiktok", "youtube", "twitter"]
  const usernames = [
    "fashionista_jane",
    "tech_guru_mike",
    "fitness_queen",
    "foodie_adventures",
    "travel_with_me",
    "lifestyle_lisa",
    "beauty_by_sarah",
    "gaming_pro",
    "art_creator",
    "music_maven",
    "diy_master",
    "pet_lover_kate",
  ]

  return Array.from({ length: count }, (_, i) => {
    const views = Math.floor(Math.random() * 500000) + 50000
    const engagement = Math.floor(views * (0.03 + Math.random() * 0.07))
    const engagementRate = (engagement / views) * 100

    return {
      influencer: {
        id: `inf-${i + 1}`,
        username: usernames[i % usernames.length],
        displayName: usernames[i % usernames.length].replace(/_/g, " "),
        avatarUrl: null,
        platform: platforms[Math.floor(Math.random() * platforms.length)],
      },
      postsCount: Math.floor(Math.random() * 20) + 1,
      totalViews: views,
      totalEngagement: engagement,
      avgEngagementRate: engagementRate,
      roi: Math.random() * 400 - 50, // -50% to +350%
      contractValue: Math.floor(Math.random() * 5000) + 500,
      viewsHistory: Array.from({ length: 7 }, () =>
        Math.floor(Math.random() * 100000) + 10000
      ),
    }
  })
}
