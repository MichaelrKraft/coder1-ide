"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usePipelineStore, type PipelineInfluencer } from "@/stores/pipeline-store"
import type { PipelineStage } from "@/types/database"
import type { ApiResponse, PipelineResponse, PipelineMoveRequest, PipelineBulkMoveRequest } from "@/types/api"
import { useEffect } from "react"

const PIPELINE_KEY = "pipeline"

// ============================================================================
// API Functions
// ============================================================================

async function fetchPipeline(campaignId: string): Promise<ApiResponse<PipelineResponse>> {
  const response = await fetch(`/api/campaigns/${campaignId}/pipeline`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to fetch pipeline")
  }

  return response.json()
}

async function moveInfluencer({
  campaignId,
  campaignInfluencerId,
  toStage,
  notes,
}: {
  campaignId: string
  campaignInfluencerId: string
  toStage: PipelineStage
  notes?: string
}): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(`/api/campaigns/${campaignId}/pipeline`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignInfluencerId,
      toStage,
      notes,
    } satisfies PipelineMoveRequest),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to move influencer")
  }

  return response.json()
}

async function bulkMoveInfluencers({
  campaignId,
  campaignInfluencerIds,
  toStage,
  notes,
}: {
  campaignId: string
  campaignInfluencerIds: string[]
  toStage: PipelineStage
  notes?: string
}): Promise<ApiResponse<{ success: boolean; count: number }>> {
  const response = await fetch(`/api/campaigns/${campaignId}/pipeline/bulk`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignInfluencerIds,
      toStage,
      notes,
    } satisfies PipelineBulkMoveRequest),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to move influencers")
  }

  return response.json()
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch and manage pipeline data for a campaign
 * Automatically syncs with the pipeline store
 */
export function usePipeline(campaignId: string) {
  const { setInfluencers, setLoading, setError } = usePipelineStore()

  const query = useQuery({
    queryKey: [PIPELINE_KEY, campaignId],
    queryFn: () => fetchPipeline(campaignId),
    enabled: !!campaignId,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true,
  })

  // Sync query data with store
  useEffect(() => {
    if (query.isLoading) {
      setLoading(true)
    } else if (query.error) {
      setError(query.error instanceof Error ? query.error.message : "Unknown error")
    } else if (query.data?.data) {
      // Transform API response to store format
      const allInfluencers: PipelineInfluencer[] = query.data.data.stages.flatMap(
        (stage) => stage.influencers
      )
      setInfluencers(allInfluencers)
    }
  }, [query.data, query.isLoading, query.error, setInfluencers, setLoading, setError])

  return query
}

/**
 * Hook to move a single influencer to a new stage with optimistic updates
 */
export function useMoveInfluencer(campaignId: string) {
  const queryClient = useQueryClient()
  const { optimisticMove, revertMove, confirmMove } = usePipelineStore()

  return useMutation({
    mutationFn: ({
      campaignInfluencerId,
      toStage,
      notes,
    }: {
      campaignInfluencerId: string
      toStage: PipelineStage
      notes?: string
    }) =>
      moveInfluencer({
        campaignId,
        campaignInfluencerId,
        toStage,
        notes,
      }),

    onMutate: async ({ campaignInfluencerId, toStage }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [PIPELINE_KEY, campaignId] })

      // Perform optimistic update
      const snapshot = optimisticMove(campaignInfluencerId, toStage)

      return { snapshot }
    },

    onError: (_error, _variables, context) => {
      // Revert optimistic update on error
      if (context?.snapshot) {
        revertMove(context.snapshot)
      }
    },

    onSuccess: (_data, variables) => {
      // Confirm the move (remove from pending)
      confirmMove(variables.campaignInfluencerId)
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: [PIPELINE_KEY, campaignId] })
    },
  })
}

/**
 * Hook to bulk move multiple influencers
 */
export function useBulkMoveInfluencers(campaignId: string) {
  const queryClient = useQueryClient()
  const { moveSelected, clearSelection } = usePipelineStore()

  return useMutation({
    mutationFn: ({
      campaignInfluencerIds,
      toStage,
      notes,
    }: {
      campaignInfluencerIds: string[]
      toStage: PipelineStage
      notes?: string
    }) =>
      bulkMoveInfluencers({
        campaignId,
        campaignInfluencerIds,
        toStage,
        notes,
      }),

    onMutate: async ({ toStage }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [PIPELINE_KEY, campaignId] })

      // Perform optimistic update (moves all selected)
      moveSelected(toStage)
    },

    onError: () => {
      // On error, refetch to restore correct state
      queryClient.invalidateQueries({ queryKey: [PIPELINE_KEY, campaignId] })
    },

    onSuccess: () => {
      // Clear selection after successful bulk move
      clearSelection()
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: [PIPELINE_KEY, campaignId] })
    },
  })
}

/**
 * Hook to get pipeline statistics
 */
export function usePipelineStats(campaignId: string) {
  const { influencers, columns } = usePipelineStore()

  return {
    total: influencers.length,
    byStage: columns.reduce(
      (acc, col) => ({ ...acc, [col.id]: col.items.length }),
      {} as Record<PipelineStage, number>
    ),
    columns: columns.map((col) => ({
      id: col.id,
      label: col.label,
      color: col.color,
      count: col.items.length,
    })),
  }
}

/**
 * Hook to get filtered columns for the board
 */
export function useFilteredPipelineColumns() {
  const { columns, searchQuery, sortBy, sortOrder } = usePipelineStore()

  // Apply filters within each column
  return columns.map((column) => {
    let items = [...column.items]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(
        (item) =>
          item.influencer.username.toLowerCase().includes(query) ||
          item.influencer.display_name?.toLowerCase().includes(query) ||
          item.notes?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    items.sort((a, b) => {
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

    return {
      ...column,
      items,
    }
  })
}
