"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  DollarSign,
  Eye,
  Heart,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react"

// Industry benchmark data
const INDUSTRY_BENCHMARKS = {
  costPerView: {
    excellent: 0.01,
    good: 0.03,
    average: 0.05,
    poor: 0.10,
  },
  costPerEngagement: {
    excellent: 0.10,
    good: 0.25,
    average: 0.50,
    poor: 1.00,
  },
  engagementRate: {
    excellent: 6.0,
    good: 4.0,
    average: 2.5,
    poor: 1.0,
  },
}

export interface ROIMetrics {
  totalReach: number
  totalViews: number
  totalEngagement: number
  avgEngagementRate: number
}

interface ROICalculatorProps {
  metrics: ROIMetrics
  isLoading?: boolean
  title?: string
  className?: string
  defaultSpend?: number
}

type PerformanceLevel = "excellent" | "good" | "average" | "poor"

function getPerformanceLevel(
  value: number,
  thresholds: { excellent: number; good: number; average: number; poor: number },
  lowerIsBetter: boolean = true
): PerformanceLevel {
  if (lowerIsBetter) {
    if (value <= thresholds.excellent) return "excellent"
    if (value <= thresholds.good) return "good"
    if (value <= thresholds.average) return "average"
    return "poor"
  } else {
    if (value >= thresholds.excellent) return "excellent"
    if (value >= thresholds.good) return "good"
    if (value >= thresholds.average) return "average"
    return "poor"
  }
}

const performanceColors: Record<PerformanceLevel, string> = {
  excellent: "text-green-400 bg-green-500/10 border-green-500/30",
  good: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  average: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  poor: "text-red-400 bg-red-500/10 border-red-500/30",
}

const performanceIcons: Record<PerformanceLevel, typeof CheckCircle> = {
  excellent: CheckCircle,
  good: TrendingUp,
  average: AlertTriangle,
  poor: XCircle,
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
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

interface MetricRowProps {
  label: string
  value: string
  performance: PerformanceLevel
  benchmark: string
  tooltipContent: string
}

function MetricRow({
  label,
  value,
  performance,
  benchmark,
  tooltipContent,
}: MetricRowProps) {
  const Icon = performanceIcons[performance]

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <span className="text-sm text-zinc-300">{label}</span>
                <Info className="h-3.5 w-3.5 text-zinc-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs bg-zinc-900 border-zinc-700"
            >
              <p className="text-xs">{tooltipContent}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white">{value}</span>
        <Badge
          variant="outline"
          className={cn("text-xs capitalize gap-1", performanceColors[performance])}
        >
          <Icon className="h-3 w-3" />
          {performance}
        </Badge>
      </div>
    </div>
  )
}

function CalculatorSkeleton() {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ROICalculator({
  metrics,
  isLoading,
  title = "ROI Calculator",
  className,
  defaultSpend = 0,
}: ROICalculatorProps) {
  const [campaignSpend, setCampaignSpend] = useState(defaultSpend)

  const calculations = useMemo(() => {
    const spend = campaignSpend || 0

    // Cost calculations
    const costPerView = spend > 0 && metrics.totalViews > 0
      ? spend / metrics.totalViews
      : 0
    const costPerEngagement = spend > 0 && metrics.totalEngagement > 0
      ? spend / metrics.totalEngagement
      : 0
    const costPerThousandReach = spend > 0 && metrics.totalReach > 0
      ? (spend / metrics.totalReach) * 1000
      : 0

    // Estimated value calculations (based on industry standards)
    // Average social media ad CPM is around $6-8, engagement value is ~$0.50-1.00
    const estimatedMediaValue = (metrics.totalReach / 1000) * 7 + metrics.totalEngagement * 0.75
    const estimatedROI = spend > 0
      ? ((estimatedMediaValue - spend) / spend) * 100
      : 0

    // Performance levels
    const costPerViewLevel = getPerformanceLevel(
      costPerView,
      INDUSTRY_BENCHMARKS.costPerView,
      true
    )
    const costPerEngagementLevel = getPerformanceLevel(
      costPerEngagement,
      INDUSTRY_BENCHMARKS.costPerEngagement,
      true
    )
    const engagementRateLevel = getPerformanceLevel(
      metrics.avgEngagementRate,
      INDUSTRY_BENCHMARKS.engagementRate,
      false
    )

    return {
      costPerView,
      costPerEngagement,
      costPerThousandReach,
      estimatedMediaValue,
      estimatedROI,
      costPerViewLevel,
      costPerEngagementLevel,
      engagementRateLevel,
    }
  }, [campaignSpend, metrics])

  if (isLoading) {
    return <CalculatorSkeleton />
  }

  return (
    <Card className={cn("bg-zinc-900/50 border-zinc-800", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-white">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Campaign Spend Input */}
        <div className="space-y-2">
          <Label htmlFor="campaign-spend" className="text-sm text-zinc-400">
            Campaign Spend ($)
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              id="campaign-spend"
              type="number"
              min="0"
              step="100"
              value={campaignSpend || ""}
              onChange={(e) => setCampaignSpend(parseFloat(e.target.value) || 0)}
              placeholder="Enter campaign spend"
              className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Metrics Summary */}
        <div className="grid grid-cols-2 gap-3 py-3 px-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Eye className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs text-zinc-400">Total Views</span>
            </div>
            <span className="text-lg font-semibold text-white">
              {formatNumber(metrics.totalViews)}
            </span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Heart className="h-3.5 w-3.5 text-pink-400" />
              <span className="text-xs text-zinc-400">Engagement</span>
            </div>
            <span className="text-lg font-semibold text-white">
              {formatNumber(metrics.totalEngagement)}
            </span>
          </div>
        </div>

        {/* Calculated Metrics */}
        <div className="space-y-0">
          <MetricRow
            label="Cost Per View"
            value={formatCurrency(calculations.costPerView)}
            performance={calculations.costPerViewLevel}
            benchmark={`Industry avg: ${formatCurrency(INDUSTRY_BENCHMARKS.costPerView.average)}`}
            tooltipContent="The average cost to get one view. Lower is better. Industry average is around $0.05 per view."
          />
          <MetricRow
            label="Cost Per Engagement"
            value={formatCurrency(calculations.costPerEngagement)}
            performance={calculations.costPerEngagementLevel}
            benchmark={`Industry avg: ${formatCurrency(INDUSTRY_BENCHMARKS.costPerEngagement.average)}`}
            tooltipContent="The average cost to get one engagement action (like, comment, share). Lower is better. Industry average is around $0.50."
          />
          <MetricRow
            label="Engagement Rate"
            value={`${metrics.avgEngagementRate.toFixed(2)}%`}
            performance={calculations.engagementRateLevel}
            benchmark={`Industry avg: ${INDUSTRY_BENCHMARKS.engagementRate.average}%`}
            tooltipContent="The percentage of viewers who engaged with the content. Higher is better. Industry average is around 2.5%."
          />
          <MetricRow
            label="CPM (Cost per 1K Reach)"
            value={formatCurrency(calculations.costPerThousandReach)}
            performance={calculations.costPerThousandReach <= 10 ? "good" : "average"}
            benchmark="Industry avg: $6-12"
            tooltipContent="The cost to reach 1,000 people. Compare to traditional ad CPM rates."
          />
        </div>

        {/* Estimated Value & ROI */}
        {campaignSpend > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-300">Est. Media Value</span>
              <span className="text-lg font-semibold text-violet-400">
                {formatCurrency(calculations.estimatedMediaValue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Estimated ROI</span>
              <div className="flex items-center gap-2">
                {calculations.estimatedROI >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <span
                  className={cn(
                    "text-lg font-bold",
                    calculations.estimatedROI >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  )}
                >
                  {calculations.estimatedROI >= 0 ? "+" : ""}
                  {calculations.estimatedROI.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              * Estimated based on industry-standard media value calculations.
              Actual value may vary based on your specific goals and conversions.
            </p>
          </div>
        )}

        {/* Benchmarks Legend */}
        <div className="pt-2 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">Performance Benchmarks</p>
          <div className="flex flex-wrap gap-2">
            {(["excellent", "good", "average", "poor"] as const).map((level) => {
              const Icon = performanceIcons[level]
              return (
                <Badge
                  key={level}
                  variant="outline"
                  className={cn(
                    "text-[10px] capitalize gap-1",
                    performanceColors[level]
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {level}
                </Badge>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Generate mock metrics for testing
export function generateMockROIMetrics(): ROIMetrics {
  const reach = Math.floor(Math.random() * 1000000) + 100000
  const views = Math.floor(reach * (0.5 + Math.random() * 0.4))
  const engagement = Math.floor(views * (0.02 + Math.random() * 0.06))
  const engagementRate = (engagement / views) * 100

  return {
    totalReach: reach,
    totalViews: views,
    totalEngagement: engagement,
    avgEngagementRate: engagementRate,
  }
}
