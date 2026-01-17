import { create } from "zustand"
import type { CampaignInfluencer, Influencer, PipelineStage } from "@/types/database"

// Pipeline stages configuration with colors and labels
export const PIPELINE_STAGES = [
  { id: "discovered" as const, label: "Discovered", color: "zinc" },
  { id: "researching" as const, label: "Researching", color: "slate" },
  { id: "outreach_pending" as const, label: "Outreach Pending", color: "blue" },
  { id: "contacted" as const, label: "Contacted", color: "cyan" },
  { id: "in_negotiation" as const, label: "Negotiating", color: "yellow" },
  { id: "deal_signed" as const, label: "Deal Signed", color: "amber" },
  { id: "content_in_progress" as const, label: "Content in Progress", color: "violet" },
  { id: "content_posted" as const, label: "Posted", color: "purple" },
  { id: "completed" as const, label: "Completed", color: "emerald" },
  { id: "declined" as const, label: "Declined", color: "red" },
  { id: "unresponsive" as const, label: "Unresponsive", color: "gray" },
] as const

export type PipelineStageConfig = (typeof PIPELINE_STAGES)[number]

// Extended type that includes influencer data for display
export interface PipelineInfluencer extends CampaignInfluencer {
  influencer: Pick<
    Influencer,
    | "id"
    | "username"
    | "display_name"
    | "avatar_url"
    | "platform"
    | "follower_count"
    | "engagement_rate"
    | "email"
  >
  lastMessage?: {
    sentAt: string
    status: string
    channel?: "email" | "dm"
    opened_count?: number
    clicked_count?: number
    bounce_reason?: string
  } | null
}

export interface PipelineColumn {
  id: PipelineStage
  label: string
  color: string
  items: PipelineInfluencer[]
}

// Snapshot for optimistic update rollback
interface MoveSnapshot {
  itemId: string
  originalStage: PipelineStage
  timestamp: number
}

interface PipelineState {
  // Data
  influencers: PipelineInfluencer[]
  columns: PipelineColumn[]
  isLoading: boolean
  error: string | null

  // Selection
  selectedIds: Set<string>

  // Filters
  searchQuery: string
  sortBy: "name" | "followers" | "score" | "updated"
  sortOrder: "asc" | "desc"

  // Optimistic update tracking
  pendingMoves: Map<string, MoveSnapshot>

  // Actions
  setInfluencers: (influencers: PipelineInfluencer[]) => void
  addInfluencer: (influencer: PipelineInfluencer) => void
  updateInfluencer: (id: string, updates: Partial<PipelineInfluencer>) => void
  removeInfluencer: (id: string) => void

  // Move operations with optimistic updates
  moveInfluencer: (itemId: string, newStage: PipelineStage) => void
  optimisticMove: (itemId: string, newStage: PipelineStage) => MoveSnapshot | null
  revertMove: (snapshot: MoveSnapshot) => void
  confirmMove: (itemId: string) => void

  // Bulk operations
  moveSelected: (newStage: PipelineStage) => void

  // Selection
  selectItem: (id: string) => void
  deselectItem: (id: string) => void
  toggleSelection: (id: string) => void
  selectAll: () => void
  clearSelection: () => void

  // Filters
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: "name" | "followers" | "score" | "updated") => void
  setSortOrder: (order: "asc" | "desc") => void

  // Loading states
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void

  // Helpers
  getInfluencersByStage: (stage: PipelineStage) => PipelineInfluencer[]
  getFilteredInfluencers: () => PipelineInfluencer[]
  getStageCount: (stage: PipelineStage) => number
}

function buildColumns(influencers: PipelineInfluencer[]): PipelineColumn[] {
  return PIPELINE_STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    items: influencers.filter((item) => item.stage === stage.id),
  }))
}

function filterAndSortInfluencers(
  influencers: PipelineInfluencer[],
  searchQuery: string,
  sortBy: "name" | "followers" | "score" | "updated",
  sortOrder: "asc" | "desc"
): PipelineInfluencer[] {
  let filtered = influencers

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    filtered = filtered.filter(
      (item) =>
        item.influencer.username.toLowerCase().includes(query) ||
        item.influencer.display_name?.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
    )
  }

  // Apply sorting
  filtered = [...filtered].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "name":
        comparison = (a.influencer.display_name || a.influencer.username).localeCompare(
          b.influencer.display_name || b.influencer.username
        )
        break
      case "followers":
        comparison = a.influencer.follower_count - b.influencer.follower_count
        break
      case "score":
        comparison = (a.score?.overall || 0) - (b.score?.overall || 0)
        break
      case "updated":
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        break
    }

    return sortOrder === "asc" ? comparison : -comparison
  })

  return filtered
}

export const usePipelineStore = create<PipelineState>()((set, get) => ({
  // Initial state
  influencers: [],
  columns: buildColumns([]),
  isLoading: true,
  error: null,
  selectedIds: new Set(),
  searchQuery: "",
  sortBy: "updated",
  sortOrder: "desc",
  pendingMoves: new Map(),

  // Set all influencers and rebuild columns
  setInfluencers: (influencers) => {
    set({
      influencers,
      columns: buildColumns(influencers),
      isLoading: false,
      error: null,
    })
  },

  // Add a single influencer
  addInfluencer: (influencer) => {
    const newInfluencers = [...get().influencers, influencer]
    set({
      influencers: newInfluencers,
      columns: buildColumns(newInfluencers),
    })
  },

  // Update an influencer
  updateInfluencer: (id, updates) => {
    const newInfluencers = get().influencers.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    )
    set({
      influencers: newInfluencers,
      columns: buildColumns(newInfluencers),
    })
  },

  // Remove an influencer
  removeInfluencer: (id) => {
    const newInfluencers = get().influencers.filter((item) => item.id !== id)
    const newSelectedIds = new Set(get().selectedIds)
    newSelectedIds.delete(id)
    set({
      influencers: newInfluencers,
      columns: buildColumns(newInfluencers),
      selectedIds: newSelectedIds,
    })
  },

  // Move influencer (used for confirmed moves)
  moveInfluencer: (itemId, newStage) => {
    const newInfluencers = get().influencers.map((item) =>
      item.id === itemId
        ? {
            ...item,
            stage: newStage,
            stage_changed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : item
    )
    set({
      influencers: newInfluencers,
      columns: buildColumns(newInfluencers),
    })
  },

  // Optimistic move - returns snapshot for potential rollback
  optimisticMove: (itemId, newStage) => {
    const item = get().influencers.find((i) => i.id === itemId)
    if (!item) return null

    const snapshot: MoveSnapshot = {
      itemId,
      originalStage: item.stage,
      timestamp: Date.now(),
    }

    // Store the snapshot for potential rollback
    const pendingMoves = new Map(get().pendingMoves)
    pendingMoves.set(itemId, snapshot)

    // Perform the move
    const newInfluencers = get().influencers.map((i) =>
      i.id === itemId
        ? {
            ...i,
            stage: newStage,
            stage_changed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : i
    )

    set({
      influencers: newInfluencers,
      columns: buildColumns(newInfluencers),
      pendingMoves,
    })

    return snapshot
  },

  // Revert a move using the snapshot
  revertMove: (snapshot) => {
    const newInfluencers = get().influencers.map((item) =>
      item.id === snapshot.itemId
        ? {
            ...item,
            stage: snapshot.originalStage,
          }
        : item
    )

    const pendingMoves = new Map(get().pendingMoves)
    pendingMoves.delete(snapshot.itemId)

    set({
      influencers: newInfluencers,
      columns: buildColumns(newInfluencers),
      pendingMoves,
    })
  },

  // Confirm a move (remove from pending)
  confirmMove: (itemId) => {
    const pendingMoves = new Map(get().pendingMoves)
    pendingMoves.delete(itemId)
    set({ pendingMoves })
  },

  // Bulk move selected items
  moveSelected: (newStage) => {
    const selectedIds = get().selectedIds
    const newInfluencers = get().influencers.map((item) =>
      selectedIds.has(item.id)
        ? {
            ...item,
            stage: newStage,
            stage_changed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : item
    )
    set({
      influencers: newInfluencers,
      columns: buildColumns(newInfluencers),
      selectedIds: new Set(),
    })
  },

  // Selection management
  selectItem: (id) => {
    const newSelectedIds = new Set(get().selectedIds)
    newSelectedIds.add(id)
    set({ selectedIds: newSelectedIds })
  },

  deselectItem: (id) => {
    const newSelectedIds = new Set(get().selectedIds)
    newSelectedIds.delete(id)
    set({ selectedIds: newSelectedIds })
  },

  toggleSelection: (id) => {
    const newSelectedIds = new Set(get().selectedIds)
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id)
    } else {
      newSelectedIds.add(id)
    }
    set({ selectedIds: newSelectedIds })
  },

  selectAll: () => {
    const allIds = new Set(get().influencers.map((i) => i.id))
    set({ selectedIds: allIds })
  },

  clearSelection: () => {
    set({ selectedIds: new Set() })
  },

  // Filter setters
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),

  // Loading state setters
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  // Helper: Get influencers by stage
  getInfluencersByStage: (stage) => {
    return get().influencers.filter((item) => item.stage === stage)
  },

  // Helper: Get filtered influencers
  getFilteredInfluencers: () => {
    const { influencers, searchQuery, sortBy, sortOrder } = get()
    return filterAndSortInfluencers(influencers, searchQuery, sortBy, sortOrder)
  },

  // Helper: Get count for a stage
  getStageCount: (stage) => {
    return get().influencers.filter((item) => item.stage === stage).length
  },
}))
