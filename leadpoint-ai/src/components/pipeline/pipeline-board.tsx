"use client"

import * as React from "react"
import { useState, useMemo, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { PipelineColumn, PipelineColumnSkeleton } from "./pipeline-column"
import { PipelineCardOverlay } from "./pipeline-card"
import {
  usePipelineStore,
  PIPELINE_STAGES,
  type PipelineInfluencer,
} from "@/stores/pipeline-store"
import { useFilteredPipelineColumns } from "@/hooks/use-pipeline"
import type { PipelineStage } from "@/types/database"
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  LayoutList,
  CheckSquare,
  XCircle,
  ArrowRight,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react"

interface PipelineBoardProps {
  campaignId: string
  isLoading?: boolean
  onMoveInfluencer: (itemId: string, newStage: PipelineStage) => void
  onBulkMove?: (itemIds: string[], newStage: PipelineStage) => void
  onViewInfluencer?: (item: PipelineInfluencer) => void
  onMessageInfluencer?: (item: PipelineInfluencer) => void
  onRemoveInfluencer?: (item: PipelineInfluencer) => void
  onRefresh?: () => void
}

export function PipelineBoard({
  campaignId,
  isLoading = false,
  onMoveInfluencer,
  onBulkMove,
  onViewInfluencer,
  onMessageInfluencer,
  onRemoveInfluencer,
  onRefresh,
}: PipelineBoardProps) {
  // Store state
  const {
    selectedIds,
    searchQuery,
    sortBy,
    sortOrder,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    selectItem,
    deselectItem,
    toggleSelection,
    selectAll,
    clearSelection,
  } = usePipelineStore()

  // Filtered columns
  const columns = useFilteredPipelineColumns()

  // Local state
  const [activeItem, setActiveItem] = useState<PipelineInfluencer | null>(null)
  const [activeColumn, setActiveColumn] = useState<PipelineStage | null>(null)
  const [viewMode, setViewMode] = useState<"full" | "compact">("full")

  // DnD sensors with touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Stats
  const totalInfluencers = useMemo(
    () => columns.reduce((sum, col) => sum + col.items.length, 0),
    [columns]
  )

  // Handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const data = active.data.current

    if (data?.type === "pipeline-card") {
      setActiveItem(data.item as PipelineInfluencer)
    }
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (over) {
      const data = over.data.current
      if (data?.type === "column") {
        setActiveColumn(data.stage as PipelineStage)
      } else if (data?.type === "pipeline-card") {
        // If hovering over another card, get its parent column
        const item = data.item as PipelineInfluencer
        setActiveColumn(item.stage)
      }
    } else {
      setActiveColumn(null)
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveItem(null)
      setActiveColumn(null)

      if (!over) return

      const activeData = active.data.current
      const overData = over.data.current

      if (!activeData || activeData.type !== "pipeline-card") return

      const item = activeData.item as PipelineInfluencer
      let targetStage: PipelineStage | null = null

      // Determine target stage
      if (overData?.type === "column") {
        targetStage = overData.stage as PipelineStage
      } else if (overData?.type === "pipeline-card") {
        const overItem = overData.item as PipelineInfluencer
        targetStage = overItem.stage
      }

      // If dropped on a different stage, trigger move
      if (targetStage && targetStage !== item.stage) {
        onMoveInfluencer(item.id, targetStage)
      }
    },
    [onMoveInfluencer]
  )

  const handleSelectItem = useCallback(
    (id: string, selected: boolean) => {
      if (selected) {
        selectItem(id)
      } else {
        deselectItem(id)
      }
    },
    [selectItem, deselectItem]
  )

  const handleSelectAllInColumn = useCallback(
    (columnItems: PipelineInfluencer[]) => {
      columnItems.forEach((item) => selectItem(item.id))
    },
    [selectItem]
  )

  const handleBulkMove = useCallback(
    (stage: PipelineStage) => {
      if (onBulkMove && selectedIds.size > 0) {
        onBulkMove(Array.from(selectedIds), stage)
      }
    },
    [onBulkMove, selectedIds]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Filters skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-800" />
          </div>
        </div>

        {/* Board skeleton */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <PipelineColumnSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search and filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search influencers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9 bg-zinc-900/50 border-zinc-800"
            />
          </div>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-36 bg-zinc-900/50 border-zinc-800">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last Updated</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="followers">Followers</SelectItem>
              <SelectItem value="score">Score</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="icon"
            variant="outline"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="border-zinc-800 bg-zinc-900/50"
          >
            <SlidersHorizontal
              className={cn(
                "h-4 w-4 transition-transform",
                sortOrder === "desc" && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>{totalInfluencers} influencers</span>
            {selectedIds.size > 0 && (
              <Badge
                variant="outline"
                className="border-violet-500/30 bg-violet-500/10 text-violet-400"
              >
                {selectedIds.size} selected
              </Badge>
            )}
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Move ({selectedIds.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {PIPELINE_STAGES.map((stage) => (
                    <DropdownMenuItem
                      key={stage.id}
                      onClick={() => handleBulkMove(stage.id)}
                    >
                      <div
                        className={cn(
                          "mr-2 h-2 w-2 rounded-full",
                          `bg-${stage.color}-500`
                        )}
                      />
                      {stage.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                className="text-zinc-400"
              >
                <XCircle className="mr-1 h-4 w-4" />
                Clear
              </Button>
            </>
          )}

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setViewMode("full")}
              className={cn(
                "h-8 w-8 rounded-none rounded-l-lg",
                viewMode === "full" && "bg-zinc-800"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setViewMode("compact")}
              className={cn(
                "h-8 w-8 rounded-none rounded-r-lg",
                viewMode === "compact" && "bg-zinc-800"
              )}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>

          {/* Refresh */}
          {onRefresh && (
            <Button
              size="icon"
              variant="outline"
              onClick={onRefresh}
              className="border-zinc-800 bg-zinc-900/50"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="flex-1 pb-4">
          <div className="flex gap-4 min-h-[500px]">
            {columns.map((column) => (
              <PipelineColumn
                key={column.id}
                column={column}
                selectedIds={selectedIds}
                onSelectItem={handleSelectItem}
                onSelectAll={() => handleSelectAllInColumn(column.items)}
                onViewItem={onViewInfluencer || (() => {})}
                onMessageItem={onMessageInfluencer || (() => {})}
                onMoveItem={(item) => {
                  // Could open a move dialog here
                  console.log("Move item:", item)
                }}
                onRemoveItem={onRemoveInfluencer || (() => {})}
                isOver={activeColumn === column.id}
                compact={viewMode === "compact"}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeItem && <PipelineCardOverlay item={activeItem} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// Empty board state
export function PipelineBoardEmpty({
  onAddInfluencers,
}: {
  onAddInfluencers?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800/50 mb-6">
        <LayoutGrid className="h-10 w-10 text-zinc-500" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Your pipeline is empty
      </h3>
      <p className="text-zinc-400 max-w-md mb-6">
        Start by discovering influencers and adding them to your campaign pipeline.
        Track their progress through each stage of your workflow.
      </p>
      {onAddInfluencers && (
        <Button onClick={onAddInfluencers} className="bg-violet-500 hover:bg-violet-600">
          Discover Influencers
        </Button>
      )}
    </div>
  )
}
