"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { InfluencerScore } from "@/types/database"

interface ScoreBadgeProps {
  score: number
  breakdown?: InfluencerScore | null
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

const sizeConfig = {
  sm: {
    container: "h-8 w-8",
    text: "text-xs",
    stroke: 3,
    radius: 12,
  },
  md: {
    container: "h-12 w-12",
    text: "text-sm",
    stroke: 4,
    radius: 18,
  },
  lg: {
    container: "h-16 w-16",
    text: "text-base",
    stroke: 5,
    radius: 24,
  },
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400"
  if (score >= 50) return "text-amber-400"
  return "text-red-400"
}

function getScoreGradient(score: number): string {
  if (score >= 70) return "stroke-emerald-500"
  if (score >= 50) return "stroke-amber-500"
  return "stroke-red-500"
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 70) return "Good"
  if (score >= 50) return "Average"
  return "Low"
}

export function ScoreBadge({
  score,
  breakdown,
  size = "md",
  showLabel = false,
  className,
}: ScoreBadgeProps) {
  const config = sizeConfig[size]
  const circumference = 2 * Math.PI * config.radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  const badge = (
    <div
      className={cn(
        "relative flex items-center justify-center transition-transform hover:scale-110",
        config.container,
        className
      )}
    >
      {/* Background circle */}
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox={`0 0 ${(config.radius + config.stroke) * 2} ${(config.radius + config.stroke) * 2}`}
      >
        <circle
          cx={config.radius + config.stroke}
          cy={config.radius + config.stroke}
          r={config.radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-zinc-800"
        />
        <circle
          cx={config.radius + config.stroke}
          cy={config.radius + config.stroke}
          r={config.radius}
          fill="none"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          className={cn("transition-all duration-500", getScoreGradient(score))}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      {/* Score text */}
      <span className={cn("font-bold", config.text, getScoreColor(score))}>
        {score}
      </span>
    </div>
  )

  if (!breakdown) {
    return showLabel ? (
      <div className="flex items-center gap-2">
        {badge}
        <span className={cn("text-sm font-medium", getScoreColor(score))}>
          {getScoreLabel(score)}
        </span>
      </div>
    ) : (
      badge
    )
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {showLabel ? (
            <div className="flex items-center gap-2 cursor-help">
              {badge}
              <span className={cn("text-sm font-medium", getScoreColor(score))}>
                {getScoreLabel(score)}
              </span>
            </div>
          ) : (
            <div className="cursor-help">{badge}</div>
          )}
        </TooltipTrigger>
        <TooltipContent side="right" className="w-56 p-0">
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Score Breakdown</span>
              <span className={cn("text-lg font-bold", getScoreColor(score))}>
                {breakdown.overall}
              </span>
            </div>
            <div className="space-y-2">
              <ScoreRow label="Relevance" value={breakdown.relevance} />
              <ScoreRow label="Engagement" value={breakdown.engagement} />
              <ScoreRow label="Authenticity" value={breakdown.authenticity} />
              <ScoreRow label="Brand Fit" value={breakdown.brand_fit} />
              <ScoreRow label="Value" value={breakdown.value_score} />
            </div>
            {breakdown.reasoning && (
              <p className="text-xs text-zinc-400 pt-2 border-t border-zinc-800">
                {breakdown.reasoning}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", getScoreGradient(value))}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={cn("text-xs font-medium w-6 text-right", getScoreColor(value))}>
          {value}
        </span>
      </div>
    </div>
  )
}

// Compact inline badge variant
export function ScoreBadgeInline({
  score,
  className,
}: {
  score: number
  className?: string
}) {
  const bgColor =
    score >= 70
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
      : score >= 50
        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
        : "bg-red-500/10 border-red-500/30 text-red-400"

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 rounded-md border text-xs font-semibold",
        bgColor,
        className
      )}
    >
      {score}
    </span>
  )
}
