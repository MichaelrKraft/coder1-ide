"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts"
import { cn } from "@/lib/utils"
import {
  Search,
  Send,
  MessageCircle,
  Handshake,
  CheckCircle,
  Play,
  ChevronRight,
} from "lucide-react"
import type { PipelineStage } from "@/types/database"

// Chart theme for dark mode
const chartTheme = {
  background: "transparent",
  textColor: "#a1a1aa", // zinc-400
  gridColor: "#27272a", // zinc-800
  colors: ["#8b5cf6", "#22d3ee", "#22c55e", "#f59e0b", "#ef4444"],
}

// Funnel stages configuration
const funnelStages = [
  {
    id: "discovered" as const,
    label: "Discovered",
    icon: Search,
    color: "#8b5cf6", // violet-500
  },
  {
    id: "contacted" as const,
    label: "Contacted",
    icon: Send,
    color: "#06b6d4", // cyan-500
  },
  {
    id: "responded" as const,
    label: "Responded",
    icon: MessageCircle,
    color: "#22c55e", // green-500
  },
  {
    id: "negotiating" as const,
    label: "Negotiating",
    icon: Handshake,
    color: "#f59e0b", // amber-500
  },
  {
    id: "confirmed" as const,
    label: "Confirmed",
    icon: CheckCircle,
    color: "#3b82f6", // blue-500
  },
  {
    id: "posted" as const,
    label: "Posted",
    icon: Play,
    color: "#ec4899", // pink-500
  },
] as const

type FunnelStageId = (typeof funnelStages)[number]["id"]

export interface PipelineStats {
  discovered: number
  contacted: number
  responded: number
  negotiating: number
  confirmed: number
  posted: number
  completed?: number
}

export interface ConversionRates {
  discoveredToContacted: number
  contactedToResponded: number
  respondedToNegotiating: number
  negotiatingToConfirmed: number
  confirmedToPosted: number
}

interface PipelineFunnelProps {
  data: PipelineStats
  isLoading?: boolean
  title?: string
  className?: string
  showConversionRates?: boolean
  variant?: "horizontal" | "vertical"
}

function calculateConversionRate(from: number, to: number): number {
  if (from === 0) return 0
  return (to / from) * 100
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
  return `${value.toFixed(1)}%`
}

// Conversion rate arrow between stages
function ConversionArrow({
  rate,
  direction = "right",
}: {
  rate: number
  direction?: "right" | "down"
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        direction === "right" ? "flex-col px-2" : "flex-row py-2"
      )}
    >
      <ChevronRight
        className={cn(
          "h-4 w-4 text-zinc-500",
          direction === "down" && "rotate-90"
        )}
      />
      <span className="text-xs font-medium text-zinc-400">
        {formatPercentage(rate)}
      </span>
    </div>
  )
}

// Single funnel stage card
function FunnelStageCard({
  stage,
  count,
  isFirst,
  isLast,
  percentage,
}: {
  stage: (typeof funnelStages)[number]
  count: number
  isFirst: boolean
  isLast: boolean
  percentage: number
}) {
  const Icon = stage.icon

  return (
    <div
      className={cn(
        "relative flex flex-col items-center p-4 rounded-lg border transition-all duration-300",
        "bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_10px_rgba(0,212,255,0.05)]",
        "hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(0,212,255,0.1)]"
      )}
      style={{
        minWidth: isFirst ? "140px" : `${Math.max(100, 140 * (percentage / 100))}px`,
      }}
    >
      <div
        className="p-2 rounded-lg mb-2"
        style={{ backgroundColor: `${stage.color}20` }}
      >
        <Icon className="h-5 w-5" style={{ color: stage.color }} />
      </div>
      <span className="text-2xl font-bold text-white">{formatNumber(count)}</span>
      <span className="text-xs text-zinc-400 mt-1">{stage.label}</span>
      {!isFirst && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg"
          style={{
            backgroundColor: stage.color,
            opacity: 0.5,
          }}
        />
      )}
    </div>
  )
}

function FunnelSkeleton() {
  return (
    <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-24 w-24 rounded-lg" />
              {i < 6 && <Skeleton className="h-4 w-12" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Horizontal bar funnel visualization
function HorizontalFunnel({
  data,
  showConversionRates,
}: {
  data: PipelineStats
  showConversionRates: boolean
}) {
  const chartData = useMemo(() => {
    const maxValue = Math.max(
      data.discovered,
      data.contacted,
      data.responded,
      data.negotiating,
      data.confirmed,
      data.posted
    )

    return funnelStages.map((stage) => ({
      ...stage,
      value: data[stage.id],
      percentage: maxValue > 0 ? (data[stage.id] / maxValue) * 100 : 0,
    }))
  }, [data])

  const conversionRates = useMemo(
    () => ({
      discoveredToContacted: calculateConversionRate(data.discovered, data.contacted),
      contactedToResponded: calculateConversionRate(data.contacted, data.responded),
      respondedToNegotiating: calculateConversionRate(data.responded, data.negotiating),
      negotiatingToConfirmed: calculateConversionRate(data.negotiating, data.confirmed),
      confirmedToPosted: calculateConversionRate(data.confirmed, data.posted),
    }),
    [data]
  )

  return (
    <div className="space-y-4">
      {/* Visual Cards Row */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {chartData.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            <FunnelStageCard
              stage={stage}
              count={stage.value}
              isFirst={index === 0}
              isLast={index === chartData.length - 1}
              percentage={stage.percentage}
            />
            {showConversionRates && index < chartData.length - 1 && (
              <ConversionArrow
                rate={
                  index === 0
                    ? conversionRates.discoveredToContacted
                    : index === 1
                      ? conversionRates.contactedToResponded
                      : index === 2
                        ? conversionRates.respondedToNegotiating
                        : index === 3
                          ? conversionRates.negotiatingToConfirmed
                          : conversionRates.confirmedToPosted
                }
              />
            )}
          </div>
        ))}
      </div>

      {/* Bar Chart Visualization */}
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" hide />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              maxBarSize={30}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
              ))}
              <LabelList
                dataKey="label"
                position="insideLeft"
                fill="#ffffff"
                fontSize={12}
                fontWeight={500}
                dx={10}
              />
              <LabelList
                dataKey="value"
                position="right"
                fill={chartTheme.textColor}
                fontSize={12}
                formatter={(value: number) => formatNumber(value)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion Summary */}
      {showConversionRates && (
        <div className="grid grid-cols-5 gap-2 pt-2 border-t border-zinc-800">
          <div className="text-center">
            <span className="text-xs text-zinc-500">Contact Rate</span>
            <p className="text-sm font-medium text-cyan-400">
              {formatPercentage(conversionRates.discoveredToContacted)}
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs text-zinc-500">Response Rate</span>
            <p className="text-sm font-medium text-green-400">
              {formatPercentage(conversionRates.contactedToResponded)}
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs text-zinc-500">Negotiation Rate</span>
            <p className="text-sm font-medium text-amber-400">
              {formatPercentage(conversionRates.respondedToNegotiating)}
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs text-zinc-500">Confirmation Rate</span>
            <p className="text-sm font-medium text-blue-400">
              {formatPercentage(conversionRates.negotiatingToConfirmed)}
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs text-zinc-500">Posting Rate</span>
            <p className="text-sm font-medium text-pink-400">
              {formatPercentage(conversionRates.confirmedToPosted)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Vertical funnel visualization (classic funnel shape)
function VerticalFunnel({
  data,
  showConversionRates,
}: {
  data: PipelineStats
  showConversionRates: boolean
}) {
  const chartData = useMemo(() => {
    const maxValue = data.discovered || 1

    return funnelStages.map((stage, index) => ({
      ...stage,
      value: data[stage.id],
      percentage: (data[stage.id] / maxValue) * 100,
      width: `${Math.max(30, 100 - index * 12)}%`,
    }))
  }, [data])

  const conversionRates = useMemo(
    () => [
      calculateConversionRate(data.discovered, data.contacted),
      calculateConversionRate(data.contacted, data.responded),
      calculateConversionRate(data.responded, data.negotiating),
      calculateConversionRate(data.negotiating, data.confirmed),
      calculateConversionRate(data.confirmed, data.posted),
    ],
    [data]
  )

  return (
    <div className="flex flex-col items-center space-y-1">
      {chartData.map((stage, index) => (
        <div key={stage.id} className="w-full flex flex-col items-center">
          {/* Stage Bar */}
          <div
            className="relative flex items-center justify-between px-4 py-3 rounded-lg transition-all"
            style={{
              width: stage.width,
              backgroundColor: `${stage.color}20`,
              borderLeft: `3px solid ${stage.color}`,
            }}
          >
            <div className="flex items-center gap-2">
              <stage.icon className="h-4 w-4" style={{ color: stage.color }} />
              <span className="text-sm font-medium text-white">{stage.label}</span>
            </div>
            <span className="text-lg font-bold text-white">
              {formatNumber(stage.value)}
            </span>
          </div>

          {/* Conversion Rate Between Stages */}
          {showConversionRates && index < chartData.length - 1 && (
            <div className="flex items-center gap-1 py-1">
              <div className="w-px h-4 bg-zinc-700" />
              <span className="text-xs text-zinc-400">
                {formatPercentage(conversionRates[index])}
              </span>
              <div className="w-px h-4 bg-zinc-700" />
            </div>
          )}
        </div>
      ))}

      {/* Overall Conversion */}
      <div className="pt-4 mt-2 border-t border-zinc-800 w-full text-center">
        <span className="text-xs text-zinc-500">Overall Conversion</span>
        <p className="text-lg font-bold text-violet-400">
          {formatPercentage(calculateConversionRate(data.discovered, data.posted))}
        </p>
        <span className="text-xs text-zinc-500">
          {data.discovered} discovered → {data.posted} posted
        </span>
      </div>
    </div>
  )
}

export function PipelineFunnel({
  data,
  isLoading,
  title = "Pipeline Conversion Funnel",
  className,
  showConversionRates = true,
  variant = "horizontal",
}: PipelineFunnelProps) {
  if (isLoading) {
    return <FunnelSkeleton />
  }

  return (
    <Card className={cn("bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {variant === "horizontal" ? (
          <HorizontalFunnel data={data} showConversionRates={showConversionRates} />
        ) : (
          <VerticalFunnel data={data} showConversionRates={showConversionRates} />
        )}
      </CardContent>
    </Card>
  )
}

// Generate mock data for testing
export function generateMockPipelineStats(): PipelineStats {
  const discovered = Math.floor(Math.random() * 500) + 200
  const contacted = Math.floor(discovered * (0.4 + Math.random() * 0.3))
  const responded = Math.floor(contacted * (0.3 + Math.random() * 0.3))
  const negotiating = Math.floor(responded * (0.4 + Math.random() * 0.3))
  const confirmed = Math.floor(negotiating * (0.5 + Math.random() * 0.3))
  const posted = Math.floor(confirmed * (0.6 + Math.random() * 0.3))

  return {
    discovered,
    contacted,
    responded,
    negotiating,
    confirmed,
    posted,
    completed: Math.floor(posted * 0.8),
  }
}

// Transform pipeline stage data from database format
export function transformPipelineData(
  stageData: Record<PipelineStage, number>
): PipelineStats {
  return {
    discovered: stageData.discovered || 0,
    contacted: stageData.contacted || 0,
    responded:
      (stageData.in_negotiation || 0) +
      (stageData.deal_signed || 0) +
      (stageData.content_in_progress || 0) +
      (stageData.content_posted || 0) +
      (stageData.completed || 0),
    negotiating: stageData.in_negotiation || 0,
    confirmed:
      (stageData.deal_signed || 0) +
      (stageData.content_in_progress || 0) +
      (stageData.content_posted || 0) +
      (stageData.completed || 0),
    posted: (stageData.content_posted || 0) + (stageData.completed || 0),
    completed: stageData.completed || 0,
  }
}
