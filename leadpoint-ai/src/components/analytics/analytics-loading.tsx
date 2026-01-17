'use client'

import { cn } from '@/lib/utils'
import {
  Skeleton,
  ChartSkeleton,
  StatsCardSkeleton,
  TableSkeleton,
} from '@/components/ui/loading-skeleton'

// Stats card skeleton - matches StatsCards layout
export function AnalyticsStatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50 p-6',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

// Stats cards grid skeleton
export function AnalyticsStatsGridSkeleton({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-4 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <AnalyticsStatsCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Performance chart skeleton
export function PerformanceChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50 p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-80">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-4 bottom-8 flex flex-col justify-between">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-6" />
        </div>

        {/* Chart area - line chart simulation */}
        <div className="ml-14 mr-4 h-[calc(100%-40px)] relative">
          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-zinc-800/50"
              style={{ top: `${i * 25}%` }}
            />
          ))}
          {/* Fake line path placeholder */}
          <Skeleton className="absolute inset-x-0 top-1/3 h-1 rounded-full opacity-50" />
          <Skeleton className="absolute inset-x-0 top-1/2 h-1 rounded-full opacity-30" />
        </div>

        {/* X-axis labels */}
        <div className="ml-14 mr-4 absolute bottom-0 left-0 right-0 flex justify-between">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

// Engagement chart skeleton
export function EngagementChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50 p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Bar chart */}
      <div className="h-64 flex items-end gap-2 px-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <Skeleton
              className="w-full rounded-t"
              style={{ height: `${Math.random() * 60 + 20}%` }}
            />
            <Skeleton className="h-3 w-6" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Influencer performance table skeleton
export function InfluencerPerformanceTableSkeleton({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50',
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-24" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-24" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-zinc-800">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Skeleton className="h-4 w-16" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-4 w-12" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-4 w-16" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ROI Calculator skeleton
export function ROICalculatorSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50 p-6',
        className
      )}
    >
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* ROI display */}
      <div className="text-center mb-6 p-6 rounded-lg bg-zinc-900 border border-zinc-800">
        <Skeleton className="h-4 w-24 mx-auto mb-2" />
        <Skeleton className="h-12 w-32 mx-auto mb-2" />
        <Skeleton className="h-4 w-40 mx-auto" />
      </div>

      {/* Input fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="mt-6 pt-6 border-t border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  )
}

// Analytics header skeleton
export function AnalyticsHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-40 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  )
}

// Full analytics page skeleton
export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-8">
      <AnalyticsHeaderSkeleton />

      {/* Stats cards */}
      <AnalyticsStatsGridSkeleton count={4} />

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceChartSkeleton />
        <EngagementChartSkeleton />
      </div>

      {/* Performance table */}
      <InfluencerPerformanceTableSkeleton rows={5} />

      {/* ROI section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartSkeleton className="h-full" />
        </div>
        <ROICalculatorSkeleton />
      </div>
    </div>
  )
}

// Re-export with aliases for convenience
export {
  AnalyticsStatsCardSkeleton as StatsCardSkeleton,
  AnalyticsStatsGridSkeleton as StatsGridSkeleton,
  InfluencerPerformanceTableSkeleton as PerformanceTableSkeleton,
  AnalyticsHeaderSkeleton as HeaderSkeleton,
  AnalyticsPageSkeleton as PageSkeleton,
}
