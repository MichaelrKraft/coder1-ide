"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns"

// Chart theme for dark mode
const chartTheme = {
  background: "transparent",
  textColor: "#a1a1aa", // zinc-400
  gridColor: "#27272a", // zinc-800
  colors: ["#8b5cf6", "#22d3ee", "#22c55e", "#f59e0b", "#ef4444"],
}

export interface TimelineDataPoint {
  date: string
  views: number
  likes: number
  comments: number
  shares: number
}

export type DateRange = "7d" | "30d" | "90d" | "custom"

export type ChartType = "line" | "area"

interface PerformanceChartProps {
  data: TimelineDataPoint[]
  isLoading?: boolean
  title?: string
  className?: string
  defaultDateRange?: DateRange
  chartType?: ChartType
  showLegend?: boolean
  customDateRange?: { start: Date; end: Date }
  onDateRangeChange?: (range: DateRange) => void
}

interface SeriesVisibility {
  views: boolean
  likes: boolean
  comments: boolean
  shares: boolean
}

const seriesConfig = [
  { key: "views", label: "Views", color: chartTheme.colors[0] },
  { key: "likes", label: "Likes", color: chartTheme.colors[1] },
  { key: "comments", label: "Comments", color: chartTheme.colors[2] },
  { key: "shares", label: "Shares", color: chartTheme.colors[3] },
] as const

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-white mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-zinc-400 capitalize">
                {entry.dataKey}
              </span>
            </div>
            <span className="text-xs font-medium text-white">
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card className="bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-12" />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[350px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

export function PerformanceChart({
  data,
  isLoading,
  title = "Performance Overview",
  className,
  defaultDateRange = "30d",
  chartType = "area",
  showLegend = true,
  customDateRange,
  onDateRangeChange,
}: PerformanceChartProps) {
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [seriesVisibility, setSeriesVisibility] = useState<SeriesVisibility>({
    views: true,
    likes: true,
    comments: true,
    shares: true,
  })

  const filteredData = useMemo(() => {
    if (!data.length) return []

    const now = new Date()
    let startDate: Date

    if (dateRange === "custom" && customDateRange) {
      return data.filter((point) => {
        const pointDate = new Date(point.date)
        return isWithinInterval(pointDate, {
          start: startOfDay(customDateRange.start),
          end: endOfDay(customDateRange.end),
        })
      })
    }

    switch (dateRange) {
      case "7d":
        startDate = subDays(now, 7)
        break
      case "30d":
        startDate = subDays(now, 30)
        break
      case "90d":
        startDate = subDays(now, 90)
        break
      default:
        startDate = subDays(now, 30)
    }

    return data.filter((point) => {
      const pointDate = new Date(point.date)
      return pointDate >= startDate && pointDate <= now
    })
  }, [data, dateRange, customDateRange])

  const formattedData = useMemo(() => {
    return filteredData.map((point) => ({
      ...point,
      formattedDate: format(new Date(point.date), "MMM d"),
    }))
  }, [filteredData])

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
    onDateRangeChange?.(range)
  }

  const toggleSeries = (seriesKey: keyof SeriesVisibility) => {
    setSeriesVisibility((prev) => ({
      ...prev,
      [seriesKey]: !prev[seriesKey],
    }))
  }

  if (isLoading) {
    return <ChartSkeleton />
  }

  const ChartComponent = chartType === "line" ? LineChart : AreaChart
  const DataComponent = chartType === "line" ? Line : Area

  return (
    <Card className={cn("bg-zinc-900/50 border-cyan-500/20 shadow-[0_0_15px_rgba(0,212,255,0.08)]", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-white">
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <Button
                key={range}
                variant="ghost"
                size="sm"
                onClick={() => handleDateRangeChange(range)}
                className={cn(
                  "h-8 px-3 text-xs",
                  dateRange === range
                    ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Series Toggle Buttons */}
        {showLegend && (
          <div className="flex flex-wrap gap-2 mb-4">
            {seriesConfig.map(({ key, label, color }) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                onClick={() => toggleSeries(key as keyof SeriesVisibility)}
                className={cn(
                  "h-7 px-2 text-xs gap-1.5",
                  seriesVisibility[key as keyof SeriesVisibility]
                    ? "text-white hover:bg-zinc-800"
                    : "text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800"
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full transition-opacity",
                    !seriesVisibility[key as keyof SeriesVisibility] && "opacity-30"
                  )}
                  style={{ backgroundColor: color }}
                />
                {label}
              </Button>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="h-[350px] w-full">
          {formattedData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-zinc-500">No data available for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponent data={formattedData}>
                <defs>
                  {seriesConfig.map(({ key, color }) => (
                    <linearGradient
                      key={key}
                      id={`gradient-${key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartTheme.gridColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="formattedDate"
                  stroke={chartTheme.textColor}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke={chartTheme.textColor}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatNumber}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                {seriesConfig.map(({ key, color }) => {
                  if (!seriesVisibility[key as keyof SeriesVisibility]) return null

                  if (chartType === "area") {
                    return (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#gradient-${key})`}
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: color,
                          stroke: "#18181b",
                          strokeWidth: 2,
                        }}
                      />
                    )
                  }

                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: color,
                        stroke: "#18181b",
                        strokeWidth: 2,
                      }}
                    />
                  )
                })}
              </ChartComponent>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Generate mock data for testing
export function generateMockTimelineData(days: number = 90): TimelineDataPoint[] {
  const data: TimelineDataPoint[] = []
  const now = new Date()

  for (let i = days; i >= 0; i--) {
    const date = subDays(now, i)
    const baseViews = 10000 + Math.random() * 5000
    const baseLikes = baseViews * (0.05 + Math.random() * 0.05)
    const baseComments = baseLikes * (0.1 + Math.random() * 0.1)
    const baseShares = baseLikes * (0.05 + Math.random() * 0.05)

    // Add some weekly seasonality
    const dayOfWeek = date.getDay()
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1

    data.push({
      date: format(date, "yyyy-MM-dd"),
      views: Math.round(baseViews * weekendMultiplier),
      likes: Math.round(baseLikes * weekendMultiplier),
      comments: Math.round(baseComments * weekendMultiplier),
      shares: Math.round(baseShares * weekendMultiplier),
    })
  }

  return data
}
