"use client"

import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PipelineCard } from "./pipeline-card"
import type { PipelineColumn as PipelineColumnType, PipelineInfluencer } from "@/stores/pipeline-store"
import type { PipelineStage } from "@/types/database"
import { MoreHorizontal, Plus, Filter, SortAsc, CheckSquare } from "lucide-react"

interface PipelineColumnProps {
  column: PipelineColumnType
  selectedIds: Set<string>
  onSelectItem: (id: string, selected: boolean) => void
  onSelectAll: () => void
  onViewItem: (item: PipelineInfluencer) => void
  onMessageItem: (item: PipelineInfluencer) => void
  onMoveItem: (item: PipelineInfluencer) => void
  onRemoveItem: (item: PipelineInfluencer) => void
  isOver?: boolean
  compact?: boolean
}

// Stage color mapping
const STAGE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  zinc: {
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/30",
    text: "text-zinc-400",
    badge: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  },
  slate: {
    bg: "bg-slate-500/5",
    border: "border-slate-500/30",
    text: "text-slate-400",
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  },
  blue: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/30",
    text: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  cyan: {
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  yellow: {
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  },
  amber: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  violet: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/30",
    text: "text-violet-400",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
  purple: {
    bg: "bg-purple-500/5",
    border: "border-purple-500/30",
    text: "text-purple-400",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  emerald: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  red: {
    bg: "bg-red-500/5",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  gray: {
    bg: "bg-gray-500/5",
    border: "border-gray-500/30",
    text: "text-gray-400",
    badge: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  },
}

export function PipelineColumn({
  column,
  selectedIds,
  onSelectItem,
  onSelectAll,
  onViewItem,
  onMessageItem,
  onMoveItem,
  onRemoveItem,
  isOver = false,
  compact = false,
}: PipelineColumnProps) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      stage: column.id,
    },
  })

  const colors = STAGE_COLORS[column.color] || STAGE_COLORS.zinc
  const itemIds = column.items.map((item) => item.id)
  const selectedInColumn = column.items.filter((item) => selectedIds.has(item.id)).length
  const dropping = isOver || isDroppableOver

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-[320px] flex-shrink-0 flex-col rounded-2xl border bg-zinc-900/30 transition-all",
        dropping ? "border-violet-500/50 bg-violet-500/5 ring-2 ring-violet-500/20" : "border-zinc-800/50"
      )}
    >
      {/* Column Header */}
      <div className={cn("flex items-center justify-between border-b px-4 py-3", colors.border)}>
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", colors.text.replace("text-", "bg-"))} />
          <h3 className="text-sm font-semibold text-white">{column.label}</h3>
          <Badge
            variant="outline"
            className={cn("text-xs px-1.5 py-0", colors.badge)}
          >
            {column.items.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {selectedInColumn > 0 && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0 border-violet-500/30 bg-violet-500/10 text-violet-400"
            >
              {selectedInColumn} selected
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onSelectAll}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Select All in Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {column.items.length === 0 ? (
            <EmptyColumnState color={column.color} dropping={dropping} />
          ) : (
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {column.items.map((item) => (
                  <PipelineCard
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    onSelect={(selected) => onSelectItem(item.id, selected)}
                    onView={() => onViewItem(item)}
                    onMessage={() => onMessageItem(item)}
                    onMove={() => onMoveItem(item)}
                    onRemove={() => onRemoveItem(item)}
                    compact={compact}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </ScrollArea>

      {/* Drop indicator at bottom when dragging over */}
      {dropping && (
        <div className="mx-3 mb-3 flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-violet-500/50 bg-violet-500/5">
          <p className="text-sm text-violet-400">Drop here</p>
        </div>
      )}
    </div>
  )
}

function EmptyColumnState({ color, dropping }: { color: string; dropping: boolean }) {
  const colors = STAGE_COLORS[color] || STAGE_COLORS.zinc

  return (
    <div
      className={cn(
        "flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors",
        dropping
          ? "border-violet-500/50 bg-violet-500/5"
          : colors.border + " " + colors.bg
      )}
    >
      <div className={cn("mb-2 rounded-lg p-2", colors.bg)}>
        <Plus className={cn("h-5 w-5", colors.text)} />
      </div>
      <p className="text-sm text-zinc-500">
        {dropping ? "Drop here" : "No influencers"}
      </p>
      <p className="mt-1 text-xs text-zinc-600">
        {dropping ? "Release to add" : "Drag cards here"}
      </p>
    </div>
  )
}

// Column skeleton for loading state
export function PipelineColumnSkeleton() {
  return (
    <div className="flex h-full w-[320px] flex-shrink-0 flex-col rounded-2xl border border-zinc-800/50 bg-zinc-900/30">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-700" />
          <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
          <div className="h-5 w-6 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="h-7 w-7 animate-pulse rounded bg-zinc-800" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 space-y-2 p-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50"
          />
        ))}
      </div>
    </div>
  )
}
