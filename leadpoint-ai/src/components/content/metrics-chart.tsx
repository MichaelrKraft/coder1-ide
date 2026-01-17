'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { Eye, Heart, MessageCircle, Share2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/hooks/use-content'
import type { MetricsSnapshot } from '@/types/content'

// ============================================================================
// Types
// ============================================================================

interface MetricsChartProps {
  history: MetricsSnapshot[]
  title?: string
}

type MetricKey = 'views' | 'likes' | 'comments' | 'shares'

interface MetricConfig {
  key: MetricKey
  label: string
  color: string
  icon: typeof Eye
}

// ============================================================================
// Configuration
// ============================================================================

const metricConfigs: MetricConfig[] = [
  { key: 'views', label: 'Views', color: '#8b5cf6', icon: Eye },
  { key: 'likes', label: 'Likes', color: '#f43f5e', icon: Heart },
  { key: 'comments', label: 'Comments', color: '#3b82f6', icon: MessageCircle },
  { key: 'shares', label: 'Shares', color: '#10b981', icon: Share2 },
]

// ============================================================================
// Custom Tooltip
// ============================================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    dataKey: string
    color: string
    payload?: {
      originalTimestamp?: string
      formattedDate?: string
    }
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  // Safely format the date - use originalTimestamp if available, otherwise just show the label
  let formattedLabel = label || ''
  try {
    const originalTimestamp = payload[0]?.payload?.originalTimestamp
    if (originalTimestamp) {
      const parsed = parseISO(originalTimestamp)
      if (!isNaN(parsed.getTime())) {
        formattedLabel = format(parsed, 'MMM d, yyyy h:mm a')
      }
    }
  } catch {
    // Keep the original label if parsing fails
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-zinc-400 text-sm mb-2">
        {formattedLabel}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const config = metricConfigs.find((c) => c.key === entry.dataKey)
          const Icon = config?.icon || Eye
          return (
            <div
              key={entry.dataKey}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" style={{ color: entry.color }} />
                <span className="text-zinc-300 text-sm capitalize">
                  {config?.label || entry.dataKey}
                </span>
              </div>
              <span className="text-white font-medium">
                {formatNumber(entry.value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Metrics Toggle Button
// ============================================================================

function MetricToggle({
  config,
  isActive,
  onClick,
}: {
  config: MetricConfig
  isActive: boolean
  onClick: () => void
}) {
  const Icon = config.icon

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors
        ${
          isActive
            ? 'bg-zinc-800 text-white'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
        }
      `}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: isActive ? config.color : '#71717a' }}
      />
      <Icon className="h-3.5 w-3.5" />
      <span className="text-sm">{config.label}</span>
    </Button>
  )
}

// ============================================================================
// Metrics Chart Component
// ============================================================================

export function MetricsChart({ history, title = 'Performance Over Time' }: MetricsChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(
    new Set(['views', 'likes'])
  )

  // Format data for the chart - safely handle invalid timestamps
  const chartData = history.map((snapshot) => {
    let formattedDate = ''
    let originalTimestamp = snapshot.timestamp

    try {
      if (snapshot.timestamp) {
        const parsed = parseISO(snapshot.timestamp)
        if (!isNaN(parsed.getTime())) {
          formattedDate = format(parsed, 'MMM d')
        }
      }
    } catch {
      // Invalid date, use empty string
    }

    return {
      ...snapshot,
      formattedDate,
      originalTimestamp,
    }
  })

  // Toggle metric visibility
  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        // Don't allow deselecting all metrics
        if (next.size > 1) {
          next.delete(key)
        }
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Calculate growth metrics
  const getGrowth = (key: MetricKey): { value: number; isPositive: boolean } => {
    if (history.length < 2) return { value: 0, isPositive: true }
    const first = history[0][key] || 0
    const last = history[history.length - 1][key] || 0
    if (first === 0) return { value: 100, isPositive: true }
    const growth = ((last - first) / first) * 100
    return { value: Math.abs(growth), isPositive: growth >= 0 }
  }

  if (!history || history.length === 0) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-400" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-zinc-500">
            No metrics history available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-400" />
            {title}
          </CardTitle>

          {/* Metric Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {metricConfigs.map((config) => (
              <MetricToggle
                key={config.key}
                config={config}
                isActive={activeMetrics.has(config.key)}
                onClick={() => toggleMetric(config.key)}
              />
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Growth Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {metricConfigs
            .filter((config) => activeMetrics.has(config.key))
            .map((config) => {
              const growth = getGrowth(config.key)
              const Icon = config.icon
              const latestValue = history[history.length - 1]?.[config.key] || 0

              return (
                <div
                  key={config.key}
                  className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4" style={{ color: config.color }} />
                    <span className="text-sm text-zinc-400">{config.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-white">
                      {formatNumber(latestValue)}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        growth.isPositive ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {growth.isPositive ? '+' : '-'}
                      {growth.value.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />
              <XAxis
                dataKey="formattedDate"
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatNumber(value)}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />

              {metricConfigs
                .filter((config) => activeMetrics.has(config.key))
                .map((config) => (
                  <Line
                    key={config.key}
                    type="monotone"
                    dataKey={config.key}
                    stroke={config.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: config.color,
                      stroke: '#18181b',
                      strokeWidth: 2,
                    }}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Mini Metrics Sparkline (for cards/compact views)
// ============================================================================

interface MiniSparklineProps {
  data: number[]
  color?: string
  height?: number
}

export function MiniSparkline({
  data,
  color = '#8b5cf6',
  height = 40,
}: MiniSparklineProps) {
  if (!data || data.length < 2) return null

  const chartData = data.map((value, index) => ({ value, index }))

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MetricsChart
