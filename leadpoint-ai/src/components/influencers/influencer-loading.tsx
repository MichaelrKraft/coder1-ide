'use client'

import { cn } from '@/lib/utils'
import {
  Skeleton,
  TableRowSkeleton,
  TableSkeleton,
  CardSkeleton,
  AvatarSkeleton,
} from '@/components/ui/loading-skeleton'

// Influencer card skeleton - matches InfluencerCard layout
export function InfluencerCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50 p-4',
        className
      )}
    >
      {/* Header with avatar and info */}
      <div className="flex items-start gap-3 mb-4">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        {/* Score badge */}
        <Skeleton className="h-8 w-16 rounded-full flex-shrink-0" />
      </div>

      {/* Bio */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-md bg-zinc-900">
          <Skeleton className="h-5 w-12 mx-auto mb-1" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        <div className="text-center p-2 rounded-md bg-zinc-900">
          <Skeleton className="h-5 w-10 mx-auto mb-1" />
          <Skeleton className="h-3 w-14 mx-auto" />
        </div>
        <div className="text-center p-2 rounded-md bg-zinc-900">
          <Skeleton className="h-5 w-14 mx-auto mb-1" />
          <Skeleton className="h-3 w-10 mx-auto" />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md flex-shrink-0" />
      </div>
    </div>
  )
}

// Influencer grid skeleton
export function InfluencerGridSkeleton({
  count = 9,
  columns = 3,
  className,
}: {
  count?: number
  columns?: 2 | 3 | 4
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <InfluencerCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Influencer table row skeleton
export function InfluencerTableRowSkeleton() {
  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-900/50">
      {/* Checkbox */}
      <td className="p-4 w-12">
        <Skeleton className="h-4 w-4 rounded" />
      </td>
      {/* Avatar & Name */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </td>
      {/* Platform */}
      <td className="p-4">
        <Skeleton className="h-6 w-20 rounded-full" />
      </td>
      {/* Followers */}
      <td className="p-4">
        <Skeleton className="h-4 w-16" />
      </td>
      {/* Engagement */}
      <td className="p-4">
        <Skeleton className="h-4 w-12" />
      </td>
      {/* Score */}
      <td className="p-4">
        <Skeleton className="h-8 w-12 rounded-full" />
      </td>
      {/* Actions */}
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </td>
    </tr>
  )
}

// Influencer table skeleton
export function InfluencerTableSkeleton({
  rows = 10,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden',
        className
      )}
    >
      {/* Table header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {/* Table body */}
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <InfluencerTableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Influencer filters skeleton
export function InfluencerFiltersSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* Search */}
      <Skeleton className="h-10 w-64 rounded-md" />
      {/* Platform filter */}
      <Skeleton className="h-10 w-36 rounded-md" />
      {/* Followers filter */}
      <Skeleton className="h-10 w-40 rounded-md" />
      {/* Engagement filter */}
      <Skeleton className="h-10 w-36 rounded-md" />
      {/* Niche filter */}
      <Skeleton className="h-10 w-32 rounded-md" />
      {/* Clear button */}
      <Skeleton className="h-10 w-24 rounded-md" />
    </div>
  )
}

// Influencer detail panel skeleton
export function InfluencerDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      </div>

      {/* Bio section */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-6 w-12" />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <Skeleton className="h-3 w-18 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-18 rounded-full" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>
  )
}

// Discovery form skeleton
export function DiscoveryFormSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-80 mx-auto" />
      </div>

      {/* Search field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>

      {/* Platform selection */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>

      {/* Follower range */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      {/* Engagement range */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Submit button */}
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  )
}

// Full influencer discovery page skeleton
export function InfluencerDiscoverySkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* Filters */}
      <InfluencerFiltersSkeleton />

      {/* Results count */}
      <Skeleton className="h-4 w-32" />

      {/* Grid/Table toggle and sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* Results grid */}
      <InfluencerGridSkeleton count={9} />

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  )
}

// Re-export with aliases for convenience
export {
  InfluencerCardSkeleton as CardSkeleton,
  InfluencerGridSkeleton as GridSkeleton,
  InfluencerTableRowSkeleton as TableRowSkeleton,
  InfluencerTableSkeleton as TableSkeleton,
  InfluencerFiltersSkeleton as FiltersSkeleton,
  InfluencerDetailSkeleton as DetailSkeleton,
  InfluencerDiscoverySkeleton as PageSkeleton,
}
