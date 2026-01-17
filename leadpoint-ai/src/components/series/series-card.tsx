"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Eye,
  Sparkles,
  ArrowRight,
  Repeat
} from "lucide-react"
import type { ViralSeries } from '@/types/database'

interface SeriesCardProps {
  series: ViralSeries
  healthScore?: number
  healthStatus?: 'thriving' | 'stable' | 'needs_attention' | 'declining'
  onClick?: () => void
  className?: string
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(0)}K`
  return views.toString()
}

function getTrendIcon(trend: ViralSeries['trend_direction']) {
  switch (trend) {
    case 'growing': return <TrendingUp className="h-4 w-4 text-emerald-400" />
    case 'declining': return <TrendingDown className="h-4 w-4 text-red-400" />
    default: return <Minus className="h-4 w-4 text-zinc-400" />
  }
}

function getHealthColor(status?: string): string {
  switch (status) {
    case 'thriving': return 'bg-emerald-500'
    case 'stable': return 'bg-blue-500'
    case 'needs_attention': return 'bg-amber-500'
    case 'declining': return 'bg-red-500'
    default: return 'bg-zinc-500'
  }
}

function getFormatBadge(format: ViralSeries['format_type']): { label: string; color: string } {
  const formats: Record<ViralSeries['format_type'], { label: string; color: string }> = {
    educational: { label: 'Educational', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    storytelling: { label: 'Storytelling', color: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
    trend: { label: 'Trend', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    challenge: { label: 'Challenge', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
    review: { label: 'Review', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    transformation: { label: 'Transformation', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    other: { label: 'Other', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
  }
  return formats[format]
}

export function SeriesCard({ series, healthScore, healthStatus, onClick, className }: SeriesCardProps) {
  const format = getFormatBadge(series.format_type)

  return (
    <Card
      className={cn(
        "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
              {series.name}
            </CardTitle>
            {series.hook_pattern && (
              <p className="text-xs text-zinc-500 mt-1 truncate italic">
                &quot;{series.hook_pattern}&quot;
              </p>
            )}
          </div>
          <Badge variant="outline" className={cn("ml-2 shrink-0", format.color)}>
            {format.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-white">
              {formatViews(series.total_views)}
            </span>
            <span className="text-xs text-zinc-500">total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Play className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-white">
              {series.total_videos}
            </span>
            <span className="text-xs text-zinc-500">videos</span>
          </div>
          <div className="flex items-center gap-1">
            {getTrendIcon(series.trend_direction)}
            <span className="text-xs text-zinc-400 capitalize">{series.trend_direction}</span>
          </div>
        </div>

        {/* Avg per video */}
        <div className="flex items-center gap-2 text-xs">
          <Repeat className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-zinc-400">
            Avg: <span className="text-white font-medium">{formatViews(series.avg_views_per_video)}</span> per video
          </span>
        </div>

        {/* Health bar */}
        {healthScore !== undefined && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Series Health</span>
              <span className={cn(
                "font-medium capitalize",
                healthStatus === 'thriving' ? 'text-emerald-400' :
                healthStatus === 'stable' ? 'text-blue-400' :
                healthStatus === 'needs_attention' ? 'text-amber-400' : 'text-red-400'
              )}>
                {healthStatus?.replace('_', ' ')}
              </span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={cn("h-full transition-all", getHealthColor(healthStatus))}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Action hint */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI variations available</span>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
        </div>
      </CardContent>
    </Card>
  )
}

export function SeriesCardSkeleton() {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse" />
            <div className="h-3 w-32 bg-zinc-800/50 rounded animate-pulse" />
          </div>
          <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse" />
          <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="h-1.5 w-full bg-zinc-800 rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}
