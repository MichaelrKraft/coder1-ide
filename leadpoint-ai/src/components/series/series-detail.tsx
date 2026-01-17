"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  Check,
  X,
  Lightbulb,
  Target,
  Calendar,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import type { ViralSeries, SeriesVideo, SeriesVariation } from '@/types/database'

interface SeriesDetailProps {
  series: ViralSeries
  videos: SeriesVideo[]
  variations: SeriesVariation[]
  healthScore: number
  healthStatus: 'thriving' | 'stable' | 'needs_attention' | 'declining'
  onGenerateVariations?: () => void
  onApproveVariation?: (id: string) => void
  onRejectVariation?: (id: string) => void
  isGenerating?: boolean
  className?: string
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(0)}K`
  return views.toString()
}

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function getPerformanceColor(perf: number): string {
  if (perf >= 150) return 'text-emerald-400 bg-emerald-500/10'
  if (perf >= 100) return 'text-blue-400 bg-blue-500/10'
  if (perf >= 75) return 'text-amber-400 bg-amber-500/10'
  return 'text-red-400 bg-red-500/10'
}

function getVariationTypeLabel(type: SeriesVideo['variation_type']): { label: string; color: string } {
  const types = {
    original: { label: 'Original', color: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
    iteration: { label: 'Iteration', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    trend_adaptation: { label: 'Trend', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    cross_promote: { label: 'Cross-Promo', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  }
  return types[type]
}

export function SeriesDetail({
  series,
  videos,
  variations,
  healthScore,
  healthStatus,
  onGenerateVariations,
  onApproveVariation,
  onRejectVariation,
  isGenerating,
  className,
}: SeriesDetailProps) {
  const sortedVideos = [...videos].sort((a, b) =>
    new Date(b.posted_at || '').getTime() - new Date(a.posted_at || '').getTime()
  )

  const pendingVariations = variations.filter(v => v.status === 'suggested')

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)}>
      {/* Left: Videos Timeline */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Video Performance</CardTitle>
                <CardDescription>
                  {videos.length} videos - {formatViews(series.total_views)} total views
                </CardDescription>
              </div>
              <Badge variant="outline" className={cn(
                "capitalize",
                series.trend_direction === 'growing' ? 'border-emerald-500/30 text-emerald-400' :
                series.trend_direction === 'declining' ? 'border-red-500/30 text-red-400' :
                'border-zinc-500/30 text-zinc-400'
              )}>
                {series.trend_direction === 'growing' && <TrendingUp className="h-3 w-3 mr-1" />}
                {series.trend_direction === 'declining' && <TrendingDown className="h-3 w-3 mr-1" />}
                {series.trend_direction === 'stable' && <Minus className="h-3 w-3 mr-1" />}
                {series.trend_direction}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {sortedVideos.map((video, idx) => {
                  const typeInfo = getVariationTypeLabel(video.variation_type)
                  return (
                    <div
                      key={video.id}
                      className="flex items-start gap-4 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                    >
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          idx === 0 ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-700 text-zinc-400'
                        )}>
                          {videos.length - idx}
                        </div>
                        {idx < sortedVideos.length - 1 && (
                          <div className="w-0.5 h-8 bg-zinc-700 mt-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {video.title || 'Untitled Video'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn("text-[10px]", typeInfo.color)}>
                                {typeInfo.label}
                              </Badge>
                              {video.posted_at && (
                                <span className="text-xs text-zinc-500">
                                  {new Date(video.posted_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <a
                            href={video.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4 text-zinc-500" />
                          </a>
                        </div>

                        {/* Metrics row */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs">
                            <Eye className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="text-white font-medium">{formatViews(video.views)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Heart className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="text-zinc-400">{formatNumber(video.likes)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <MessageCircle className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="text-zinc-400">{formatNumber(video.comments)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Share2 className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="text-zinc-400">{formatNumber(video.shares)}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("ml-auto text-[10px]", getPerformanceColor(video.performance_vs_series_avg))}
                          >
                            {video.performance_vs_series_avg}% vs avg
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right: AI Variations */}
      <div className="space-y-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                AI Variations
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={onGenerateVariations}
                disabled={isGenerating}
                className="gap-1"
              >
                {isGenerating ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
            <CardDescription>
              AI-suggested video variations based on top performers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-2">
              <div className="space-y-3">
                {pendingVariations.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No pending variations</p>
                    <p className="text-xs">Click generate to get AI suggestions</p>
                  </div>
                ) : (
                  pendingVariations.map(variation => (
                    <VariationCard
                      key={variation.id}
                      variation={variation}
                      onApprove={() => onApproveVariation?.(variation.id)}
                      onReject={() => onRejectVariation?.(variation.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function VariationCard({
  variation,
  onApprove,
  onReject,
}: {
  variation: SeriesVariation
  onApprove?: () => void
  onReject?: () => void
}) {
  return (
    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white">
          {variation.variation_idea}
        </p>
        <Badge variant="outline" className={cn(
          "text-[10px] shrink-0",
          variation.confidence_score >= 80 ? 'border-emerald-500/30 text-emerald-400' :
          variation.confidence_score >= 60 ? 'border-blue-500/30 text-blue-400' :
          'border-amber-500/30 text-amber-400'
        )}>
          {variation.confidence_score}%
        </Badge>
      </div>

      {variation.hook_variation && (
        <div className="flex items-start gap-2 text-xs">
          <Target className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
          <p className="text-zinc-400 italic">&quot;{variation.hook_variation}&quot;</p>
        </div>
      )}

      {variation.target_audience_twist && (
        <div className="flex items-start gap-2 text-xs">
          <Lightbulb className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-zinc-400">{variation.target_audience_twist}</p>
        </div>
      )}

      {variation.recommended_timing && (
        <div className="flex items-start gap-2 text-xs">
          <Calendar className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-zinc-400">{variation.recommended_timing}</p>
        </div>
      )}

      {variation.ai_reasoning && (
        <p className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-700/50">
          {variation.ai_reasoning}
        </p>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          onClick={onApprove}
        >
          <Check className="h-3 w-3" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-7 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
          onClick={onReject}
        >
          <X className="h-3 w-3" />
          Skip
        </Button>
      </div>
    </div>
  )
}
