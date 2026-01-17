"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Lightbulb,
  Package,
  Zap,
  Shield,
  Film,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react"
import { calculateDeal, estimateBaseRate, compareBundleSizes } from '@/lib/deals/deal-calculator'
import type { DealCalculation, DealTerms } from '@/types/database'

interface DealCalculatorProps {
  influencerId?: string
  followerCount: number
  initialBaseRate?: number
  onCalculate?: (deal: DealCalculation) => void
  className?: string
}

function getRatingColor(rating: DealCalculation['deal_rating']): string {
  switch (rating) {
    case 'excellent': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    case 'good': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'fair': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'overpriced': return 'bg-red-500/10 text-red-400 border-red-500/30'
  }
}

function getRatingIcon(rating: DealCalculation['deal_rating']) {
  switch (rating) {
    case 'excellent': return <CheckCircle className="h-5 w-5 text-emerald-400" />
    case 'good': return <TrendingUp className="h-5 w-5 text-blue-400" />
    case 'fair': return <Info className="h-5 w-5 text-amber-400" />
    case 'overpriced': return <AlertTriangle className="h-5 w-5 text-red-400" />
  }
}

export function DealCalculator({
  followerCount,
  initialBaseRate,
  className,
}: DealCalculatorProps) {
  // Form state
  const [baseRate, setBaseRate] = React.useState(initialBaseRate || estimateBaseRate(followerCount))
  const [videosCount, setVideosCount] = React.useState(3)
  const [platform, setPlatform] = React.useState<'tiktok' | 'instagram' | 'youtube'>('tiktok')
  const [contentType, setContentType] = React.useState<'reel' | 'story' | 'post' | 'video' | 'short'>('reel')
  const [exclusivityDays, setExclusivityDays] = React.useState(30)
  const [usageRights, setUsageRights] = React.useState<'organic_only' | 'paid_ads' | 'full_buyout'>('organic_only')
  const [isUrgent, setIsUrgent] = React.useState(false)
  const turnaroundDays = 14 // Default turnaround days

  // Calculate deal
  const deal = React.useMemo(() => {
    const terms: DealTerms = {
      videosCount,
      platform,
      contentType,
      exclusivityDays,
      usageRights,
      isUrgent,
      turnaroundDays,
    }

    return calculateDeal({
      baseRatePerVideo: baseRate,
      followerCount,
      terms,
    })
  }, [baseRate, videosCount, platform, contentType, exclusivityDays, usageRights, isUrgent, turnaroundDays, followerCount])

  // Bundle comparison
  const bundleComparison = React.useMemo(() => {
    return compareBundleSizes(baseRate, followerCount, {
      platform,
      contentType,
      exclusivityDays,
      usageRights,
      isUrgent,
      turnaroundDays,
    })
  }, [baseRate, followerCount, platform, contentType, exclusivityDays, usageRights, isUrgent, turnaroundDays])

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Calculator Form */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-violet-400" />
              Deal Calculator
            </CardTitle>
            <CardDescription>
              Configure deal terms to calculate optimal pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Base Rate */}
            <div className="space-y-2">
              <Label className="text-sm">Base Rate per Video</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-zinc-500" />
                <Input
                  type="number"
                  value={baseRate}
                  onChange={(e) => setBaseRate(Number(e.target.value))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Estimated market rate: ${estimateBaseRate(followerCount).toLocaleString()}
              </p>
            </div>

            {/* Videos Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Number of Videos</Label>
                <Badge variant="outline" className="font-mono">
                  {videosCount}
                </Badge>
              </div>
              <Slider
                value={[videosCount]}
                onValueChange={([v]) => setVideosCount(v)}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-zinc-500">
                <span>1 video</span>
                <span className="text-amber-400">3+ = 20% off</span>
                <span className="text-emerald-400">5+ = 35% off</span>
                <span>10</span>
              </div>
            </div>

            {/* Platform & Content Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Content Type</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as typeof contentType)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reel">Reel/Short</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="post">Post</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Usage Rights */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Film className="h-4 w-4" />
                Usage Rights
              </Label>
              <Select value={usageRights} onValueChange={(v) => setUsageRights(v as typeof usageRights)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organic_only">Organic Only (No Premium)</SelectItem>
                  <SelectItem value="paid_ads">Include Paid Ads (+25%)</SelectItem>
                  <SelectItem value="full_buyout">Full Buyout (+50%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Exclusivity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Exclusivity Period
                </Label>
                <Badge variant="outline" className="font-mono">
                  {exclusivityDays} days
                </Badge>
              </div>
              <Slider
                value={[exclusivityDays]}
                onValueChange={([v]) => setExclusivityDays(v)}
                min={0}
                max={180}
                step={15}
                className="py-2"
              />
            </div>

            {/* Rush Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Rush Delivery
                </Label>
                <p className="text-xs text-zinc-500">
                  &lt;7 day turnaround adds 25% premium
                </p>
              </div>
              <Switch
                checked={isUrgent}
                onCheckedChange={setIsUrgent}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Deal Summary */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Deal Summary</CardTitle>
                <Badge variant="outline" className={cn("gap-1", getRatingColor(deal.deal_rating))}>
                  {getRatingIcon(deal.deal_rating)}
                  {deal.deal_rating.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">
                    {deal.videos_count} videos x ${deal.base_rate_per_video.toLocaleString()}
                  </span>
                  <span className="text-zinc-300">${deal.subtotal.toLocaleString()}</span>
                </div>

                {deal.bundle_discount_percent > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      Bundle Discount (-{deal.bundle_discount_percent}%)
                    </span>
                    <span className="text-emerald-400">-${deal.total_discount.toLocaleString()}</span>
                  </div>
                )}

                {deal.urgency_premium_percent > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-400 flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" />
                      Rush Fee (+{deal.urgency_premium_percent}%)
                    </span>
                    <span className="text-amber-400">
                      +${Math.round(deal.subtotal * deal.urgency_premium_percent / 100).toLocaleString()}
                    </span>
                  </div>
                )}

                {deal.usage_rights_premium_percent > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-400 flex items-center gap-1">
                      <Film className="h-3.5 w-3.5" />
                      Usage Rights (+{deal.usage_rights_premium_percent}%)
                    </span>
                    <span className="text-blue-400">
                      +${Math.round(deal.subtotal * deal.usage_rights_premium_percent / 100).toLocaleString()}
                    </span>
                  </div>
                )}

                <Separator className="bg-zinc-800" />

                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-white">Total</span>
                  <span className="text-2xl font-bold text-white">
                    ${deal.final_price.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Effective rate per video</span>
                  <span className="text-zinc-300">${deal.price_per_video_effective.toLocaleString()}</span>
                </div>

                {deal.savings_vs_individual > 0 && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-400">Bundle Savings</span>
                      <span className="text-lg font-bold text-emerald-400">
                        ${deal.savings_vs_individual.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Negotiation Tips */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                Negotiation Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {deal.negotiation_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                    <span className="text-amber-500 mt-1">&#8226;</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Bundle Comparison */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bundle Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {bundleComparison.map(({ videos, deal: d }) => (
                  <div
                    key={videos}
                    className={cn(
                      "p-2 rounded-lg border text-center",
                      videos === videosCount
                        ? "bg-violet-500/10 border-violet-500/50"
                        : "bg-zinc-800/50 border-zinc-700"
                    )}
                  >
                    <p className="text-xs text-zinc-500">{videos} video{videos > 1 ? 's' : ''}</p>
                    <p className="text-sm font-bold text-white">
                      ${d.price_per_video_effective.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-zinc-500">/video</p>
                    {d.bundle_discount_percent > 0 && (
                      <Badge variant="outline" className="mt-1 text-[10px] border-emerald-500/30 text-emerald-400">
                        -{d.bundle_discount_percent}%
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Compact inline calculator for quick estimates
export function DealEstimator({
  followerCount,
  className,
}: {
  followerCount: number
  className?: string
}) {
  const baseRate = estimateBaseRate(followerCount)

  return (
    <div className={cn("flex items-center gap-3 text-sm", className)}>
      <span className="text-zinc-500">Est. rate:</span>
      <span className="font-medium text-white">${baseRate.toLocaleString()}/video</span>
      <span className="text-zinc-600">|</span>
      <span className="text-emerald-400">3-pack: ${Math.round(baseRate * 0.8 * 3).toLocaleString()}</span>
      <span className="text-zinc-600">|</span>
      <span className="text-violet-400">5-pack: ${Math.round(baseRate * 0.65 * 5).toLocaleString()}</span>
    </div>
  )
}
