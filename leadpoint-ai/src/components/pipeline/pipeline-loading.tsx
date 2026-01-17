'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/loading-skeleton'

// Pipeline card skeleton - matches PipelineCard layout
export function PipelineCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900 p-3 cursor-grab',
        className
      )}
    >
      {/* Header with avatar and name */}
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        {/* Menu button */}
        <Skeleton className="h-6 w-6 rounded flex-shrink-0" />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 text-xs mb-3">
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-px bg-zinc-700" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Footer with campaign and date */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

// Pipeline column skeleton - matches PipelineColumn layout
export function PipelineColumnSkeleton({
  cardCount = 3,
  className,
}: {
  cardCount?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'w-72 flex-shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/50',
        className
      )}
    >
      {/* Column header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Cards */}
      <div className="p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
        {Array.from({ length: cardCount }).map((_, i) => (
          <PipelineCardSkeleton key={i} />
        ))}
      </div>

      {/* Add button */}
      <div className="p-3 border-t border-zinc-800">
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  )
}

// Pipeline board skeleton - matches PipelineBoard layout
export function PipelineBoardSkeleton({
  columns = 5,
  className,
}: {
  columns?: number
  className?: string
}) {
  const columnCardCounts = [3, 2, 4, 2, 1] // Vary the card counts

  return (
    <div
      className={cn(
        'flex gap-4 overflow-x-auto pb-4',
        className
      )}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <PipelineColumnSkeleton
          key={i}
          cardCount={columnCardCounts[i % columnCardCounts.length]}
        />
      ))}
    </div>
  )
}

// Pipeline header skeleton
export function PipelineHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-44 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
    </div>
  )
}

// Pipeline filters skeleton
export function PipelineFiltersSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 mb-6', className)}>
      {/* Search */}
      <Skeleton className="h-10 w-56 rounded-md" />
      {/* Campaign filter */}
      <Skeleton className="h-10 w-40 rounded-md" />
      {/* Platform filter */}
      <Skeleton className="h-10 w-32 rounded-md" />
      {/* View toggle */}
      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  )
}

// Pipeline stats skeleton
export function PipelineStatsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6',
        className
      )}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
          <Skeleton className="h-7 w-12 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

// Pipeline detail modal skeleton
export function PipelineDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Stage selector */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-24 w-full rounded-md" />
      </div>

      {/* Activity timeline */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
        <Skeleton className="h-10 w-28 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-10 rounded-md ml-auto" />
      </div>
    </div>
  )
}

// Full pipeline page skeleton
export function PipelinePageSkeleton() {
  return (
    <div className="space-y-6">
      <PipelineHeaderSkeleton />
      <PipelineStatsSkeleton />
      <PipelineFiltersSkeleton />
      <PipelineBoardSkeleton columns={5} />
    </div>
  )
}

export {
  PipelineCardSkeleton as CardSkeleton,
  PipelineColumnSkeleton as ColumnSkeleton,
  PipelineBoardSkeleton as BoardSkeleton,
  PipelineHeaderSkeleton as HeaderSkeleton,
  PipelineFiltersSkeleton as FiltersSkeleton,
  PipelineStatsSkeleton as StatsSkeleton,
  PipelineDetailSkeleton as DetailSkeleton,
  PipelinePageSkeleton as PageSkeleton,
}
