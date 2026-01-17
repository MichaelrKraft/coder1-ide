"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { TrendingUp, Sparkles, Target, Zap, Gem, AlertTriangle } from "lucide-react"
import type { CeilingScoreResult } from "@/lib/scoring/ceiling-score"

interface CeilingScoreCardProps {
  result: CeilingScoreResult
  influencerName?: string
  compact?: boolean
  className?: string
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'S': return 'text-violet-400 bg-violet-500/10 border-violet-500/30'
    case 'A': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    case 'B': return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    case 'C': return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    case 'D': return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
    default: return 'text-red-400 bg-red-500/10 border-red-500/30'
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-violet-400'
  if (score >= 60) return 'text-emerald-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(0)}K`
  return views.toString()
}

export function CeilingScoreCard({
  result,
  influencerName,
  compact = false,
  className,
}: CeilingScoreCardProps) {
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2 cursor-help", className)}>
              {/* Ceiling Score Badge */}
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border",
                getGradeColor(result.grade)
              )}>
                <TrendingUp className="h-3 w-3" />
                <span className="font-bold text-sm">{result.ceilingScore}</span>
              </div>

              {/* Hidden Gem indicator */}
              {result.isHiddenGem && (
                <Badge variant="outline" className="gap-1 border-violet-500/30 text-violet-400 bg-violet-500/10">
                  <Gem className="h-3 w-3" />
                  Hidden Gem
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="w-64 p-0">
            <CeilingScoreTooltip result={result} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Card className={cn("bg-zinc-900/50 border-zinc-800", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-400">
            Ceiling Score
          </CardTitle>
          <Badge variant="outline" className={cn("text-lg font-bold", getGradeColor(result.grade))}>
            {result.grade}
          </Badge>
        </div>
        {influencerName && (
          <p className="text-xs text-zinc-500">{influencerName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Comparison */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center">
            <span className="text-xs text-zinc-500 mb-1">Ceiling</span>
            <span className={cn("text-3xl font-bold", getScoreColor(result.ceilingScore))}>
              {result.ceilingScore}
            </span>
          </div>

          <div className="flex flex-col items-center px-4">
            <span className="text-xs text-zinc-500 mb-1">vs</span>
            <Zap className={cn(
              "h-6 w-6",
              result.hiddenGemRating > 0 ? "text-emerald-400" : "text-zinc-600"
            )} />
            <span className={cn(
              "text-sm font-medium",
              result.hiddenGemRating > 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {result.hiddenGemRating > 0 ? '+' : ''}{result.hiddenGemRating}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-xs text-zinc-500 mb-1">Average</span>
            <span className={cn("text-3xl font-bold", getScoreColor(result.averageScore))}>
              {result.averageScore}
            </span>
          </div>
        </div>

        {/* Hidden Gem Badge */}
        {result.isHiddenGem && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/30">
            <Gem className="h-5 w-5 text-violet-400" />
            <div>
              <p className="text-sm font-medium text-violet-300">Hidden Gem Detected!</p>
              <p className="text-xs text-violet-400/70">
                This influencer&apos;s potential is {result.hiddenGemRating} points higher than average metrics suggest
              </p>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2">
          <MetricBox
            icon={<Target className="h-4 w-4" />}
            label="Best Video"
            value={formatViews(result.bestVideoViews)}
            highlight={result.bestVideoViews >= 500000}
          />
          <MetricBox
            icon={<Sparkles className="h-4 w-4" />}
            label="Viral Hits"
            value={result.viralVideosCount.toString()}
            highlight={result.viralVideosCount >= 2}
          />
          <MetricBox
            icon={<TrendingUp className="h-4 w-4" />}
            label="Consistency"
            value={`${result.consistencyScore}%`}
            highlight={result.consistencyScore >= 60}
          />
        </div>

        {/* Insights */}
        {result.insights.length > 0 && (
          <div className="space-y-1">
            {result.insights.map((insight, i) => (
              <p key={i} className="text-xs text-zinc-400">
                {insight}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricBox({
  icon,
  label,
  value,
  highlight
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight: boolean
}) {
  return (
    <div className={cn(
      "flex flex-col items-center p-2 rounded-lg border",
      highlight
        ? "bg-emerald-500/10 border-emerald-500/30"
        : "bg-zinc-800/50 border-zinc-700"
    )}>
      <span className={cn(
        "mb-1",
        highlight ? "text-emerald-400" : "text-zinc-500"
      )}>
        {icon}
      </span>
      <span className={cn(
        "text-lg font-bold",
        highlight ? "text-emerald-300" : "text-zinc-300"
      )}>
        {value}
      </span>
      <span className="text-[10px] text-zinc-500">{label}</span>
    </div>
  )
}

function CeilingScoreTooltip({ result }: { result: CeilingScoreResult }) {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Ceiling Analysis</span>
        <Badge variant="outline" className={getGradeColor(result.grade)}>
          {result.grade}
        </Badge>
      </div>

      <div className="space-y-2">
        <ScoreRow label="Ceiling Score" value={result.ceilingScore} max={100} />
        <ScoreRow label="Average Score" value={result.averageScore} max={100} />
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
          <span className="text-xs text-zinc-400">Potential Gap</span>
          <span className={cn(
            "text-xs font-bold",
            result.hiddenGemRating > 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {result.hiddenGemRating > 0 ? '+' : ''}{result.hiddenGemRating}
          </span>
        </div>
      </div>

      <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
        Best: {formatViews(result.bestVideoViews)} | {result.viralVideosCount} viral hits
      </div>
    </div>
  )
}

function ScoreRow({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = (value / max) * 100
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={cn("text-xs font-medium w-6 text-right", getScoreColor(value))}>
          {value}
        </span>
      </div>
    </div>
  )
}

// Export comparison component
export function CeilingVsAverageComparison({
  ceilingScore,
  averageScore,
  className,
}: {
  ceilingScore: number
  averageScore: number
  className?: string
}) {
  const gap = ceilingScore - averageScore
  const isUndervalued = gap > 15

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex flex-col items-center">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Ceiling</span>
        <span className={cn("text-xl font-bold", getScoreColor(ceilingScore))}>
          {ceilingScore}
        </span>
      </div>

      <div className="flex items-center">
        {isUndervalued ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            <span className="text-xs font-medium">+{gap}</span>
          </div>
        ) : gap < 0 ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-xs font-medium">{gap}</span>
          </div>
        ) : (
          <span className="text-xs text-zinc-500">={gap}</span>
        )}
      </div>

      <div className="flex flex-col items-center">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg</span>
        <span className={cn("text-xl font-bold", getScoreColor(averageScore))}>
          {averageScore}
        </span>
      </div>
    </div>
  )
}
