"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Campaign } from "@/types/database"
import type { ApiResponse, PaginatedResponse, CampaignStats, CampaignActivity } from "@/types/api"

const CAMPAIGNS_KEY = "campaigns"

// Types
export interface CampaignFilters {
  status?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface CampaignWithStats extends Campaign {
  stats: {
    influencerCount: number
    contentCount: number
  }
}

export interface CampaignDetail extends Campaign {
  stats: CampaignStats
  recentActivity: CampaignActivity[]
}

export interface CreateCampaignData {
  name: string
  description?: string
  target_niche: string
  hashtags: string[]
  budget?: number
  start_date?: string
  end_date?: string
}

export interface UpdateCampaignData {
  name?: string
  description?: string
  status?: "draft" | "active" | "paused" | "completed" | "archived"
  target_niche?: string
  hashtags?: string[]
  budget?: number
  start_date?: string
  end_date?: string
}

// Fetch campaigns with filters and pagination
async function fetchCampaigns(
  filters?: CampaignFilters
): Promise<PaginatedResponse<CampaignWithStats>> {
  const params = new URLSearchParams()

  if (filters) {
    if (filters.status) params.set("status", filters.status)
    if (filters.search) params.set("search", filters.search)
    if (filters.page) params.set("page", filters.page.toString())
    if (filters.pageSize) params.set("pageSize", filters.pageSize.toString())
    if (filters.sortBy) params.set("sortBy", filters.sortBy)
    if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)
  }

  const response = await fetch(`/api/campaigns?${params.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to fetch campaigns")
  }

  return response.json()
}

// Fetch single campaign with stats
async function fetchCampaign(id: string): Promise<ApiResponse<CampaignDetail>> {
  const response = await fetch(`/api/campaigns/${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to fetch campaign")
  }

  return response.json()
}

// Create campaign
async function createCampaign(
  data: CreateCampaignData
): Promise<ApiResponse<Campaign>> {
  const response = await fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to create campaign")
  }

  return response.json()
}

// Update campaign
async function updateCampaign({
  id,
  data,
}: {
  id: string
  data: UpdateCampaignData
}): Promise<ApiResponse<Campaign>> {
  const response = await fetch(`/api/campaigns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to update campaign")
  }

  return response.json()
}

// Delete (archive) campaign
async function deleteCampaign(id: string): Promise<ApiResponse<Campaign>> {
  const response = await fetch(`/api/campaigns/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to delete campaign")
  }

  return response.json()
}

// Hooks

/**
 * Hook to fetch paginated list of campaigns with optional filters
 */
export function useCampaigns(filters?: CampaignFilters) {
  return useQuery({
    queryKey: [CAMPAIGNS_KEY, filters],
    queryFn: () => fetchCampaigns(filters),
  })
}

/**
 * Hook to fetch a single campaign by ID with full stats
 */
export function useCampaign(id: string) {
  return useQuery({
    queryKey: [CAMPAIGNS_KEY, id],
    queryFn: () => fetchCampaign(id),
    enabled: !!id,
  })
}

/**
 * Hook to create a new campaign
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      // Invalidate campaigns list to refetch
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] })
    },
  })
}

/**
 * Hook to update an existing campaign
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCampaign,
    onSuccess: (_, variables) => {
      // Invalidate both the list and the specific campaign
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] })
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGNS_KEY, variables.id],
      })
    },
  })
}

/**
 * Hook to delete (archive) a campaign
 */
export function useDeleteCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      // Invalidate campaigns list to refetch
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] })
    },
  })
}
