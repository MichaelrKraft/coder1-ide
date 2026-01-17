"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  ContentPost,
  ContentFilters,
  ContentListResponse,
  CreateContentRequest,
  UpdateContentRequest,
  ContentMetrics,
  MetricsSnapshot,
} from "@/types/content"

// ============================================================================
// Query Keys
// ============================================================================

const CONTENT_KEY = "content"
const CONTENT_POST_KEY = "content-post"

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch content posts with filters and pagination
 */
async function fetchContent(
  filters?: ContentFilters
): Promise<ContentListResponse> {
  const params = new URLSearchParams()

  if (filters) {
    if (filters.campaign_id) params.set("campaign_id", filters.campaign_id)
    if (filters.influencer_id) params.set("influencer_id", filters.influencer_id)
    if (filters.status) params.set("status", filters.status)
    if (filters.post_type) params.set("post_type", filters.post_type)
    if (filters.date_from) params.set("date_from", filters.date_from)
    if (filters.date_to) params.set("date_to", filters.date_to)
    if (filters.page) params.set("page", filters.page.toString())
    if (filters.limit) params.set("limit", filters.limit.toString())
    if (filters.sort) params.set("sort", filters.sort)
    if (filters.order) params.set("order", filters.order)
  }

  const response = await fetch(`/api/content?${params.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to fetch content")
  }

  return response.json()
}

/**
 * Fetch a single content post by ID
 */
async function fetchContentPost(id: string): Promise<{ data: ContentPost }> {
  const response = await fetch(`/api/content/${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to fetch content post")
  }

  return response.json()
}

/**
 * Create a new content post
 */
async function createContent(
  data: CreateContentRequest
): Promise<{ data: ContentPost; message: string }> {
  const response = await fetch("/api/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to create content post")
  }

  return response.json()
}

/**
 * Update a content post
 */
async function updateContent({
  id,
  data,
}: {
  id: string
  data: UpdateContentRequest
}): Promise<{ data: ContentPost; message: string }> {
  const response = await fetch(`/api/content/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to update content post")
  }

  return response.json()
}

/**
 * Delete a content post
 */
async function deleteContent(id: string): Promise<{ message: string }> {
  const response = await fetch(`/api/content/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to delete content post")
  }

  return response.json()
}

/**
 * Refresh metrics for a content post
 */
async function refreshMetrics(
  id: string
): Promise<{
  data: {
    id: string
    metrics: ContentMetrics
    metrics_history?: MetricsSnapshot[]
    last_scraped_at: string
  }
  message: string
}> {
  const response = await fetch(`/api/content/${id}/refresh`, {
    method: "POST",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to refresh metrics")
  }

  return response.json()
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch content posts for a campaign with optional filters
 */
export function useContent(campaignId: string, filters?: Omit<ContentFilters, "campaign_id">) {
  return useQuery({
    queryKey: [CONTENT_KEY, campaignId, filters],
    queryFn: () => fetchContent({ campaign_id: campaignId, ...filters }),
    enabled: !!campaignId,
  })
}

/**
 * Hook to fetch all content posts with filters (not campaign-specific)
 */
export function useAllContent(filters?: ContentFilters) {
  return useQuery({
    queryKey: [CONTENT_KEY, "all", filters],
    queryFn: () => fetchContent(filters),
  })
}

/**
 * Hook to fetch a single content post by ID
 */
export function useContentPost(id: string) {
  return useQuery({
    queryKey: [CONTENT_POST_KEY, id],
    queryFn: () => fetchContentPost(id),
    enabled: !!id,
    select: (data) => data.data,
  })
}

/**
 * Hook to create a new content post
 */
export function useAddContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createContent,
    onSuccess: (_, variables) => {
      // Invalidate content list for the campaign
      queryClient.invalidateQueries({
        queryKey: [CONTENT_KEY, variables.campaign_id],
      })
      // Also invalidate all content
      queryClient.invalidateQueries({
        queryKey: [CONTENT_KEY, "all"],
      })
    },
  })
}

/**
 * Hook to update an existing content post
 */
export function useUpdateContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateContent,
    onSuccess: (_, variables) => {
      // Invalidate the specific content post
      queryClient.invalidateQueries({
        queryKey: [CONTENT_POST_KEY, variables.id],
      })
      // Invalidate all content lists
      queryClient.invalidateQueries({
        queryKey: [CONTENT_KEY],
      })
    },
  })
}

/**
 * Hook to delete a content post
 */
export function useDeleteContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteContent,
    onSuccess: () => {
      // Invalidate all content lists
      queryClient.invalidateQueries({
        queryKey: [CONTENT_KEY],
      })
    },
  })
}

/**
 * Hook to refresh metrics for a content post
 */
export function useRefreshMetrics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: refreshMetrics,
    onSuccess: (data) => {
      // Invalidate the specific content post
      queryClient.invalidateQueries({
        queryKey: [CONTENT_POST_KEY, data.data.id],
      })
      // Invalidate all content lists to reflect updated metrics
      queryClient.invalidateQueries({
        queryKey: [CONTENT_KEY],
      })
    },
  })
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format large numbers for display (10K, 1.2M, etc.)
 */
export function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "-"
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K"
  }
  return num.toString()
}

/**
 * Format engagement rate for display
 */
export function formatEngagement(rate: number | undefined): string {
  if (rate === undefined || rate === null) return "-"
  return rate.toFixed(2) + "%"
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): {
  bg: string
  text: string
  dot: string
} {
  switch (status) {
    case "published":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        dot: "bg-emerald-400",
      }
    case "scheduled":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        dot: "bg-amber-400",
      }
    case "removed":
      return {
        bg: "bg-red-500/10",
        text: "text-red-400",
        dot: "bg-red-400",
      }
    default:
      return {
        bg: "bg-zinc-500/10",
        text: "text-zinc-400",
        dot: "bg-zinc-400",
      }
  }
}

/**
 * Get platform icon name
 */
export function getPlatformIcon(platform: string): string {
  switch (platform) {
    case "tiktok":
      return "TikTok"
    case "instagram":
      return "Instagram"
    case "youtube":
      return "YouTube"
    default:
      return platform
  }
}
