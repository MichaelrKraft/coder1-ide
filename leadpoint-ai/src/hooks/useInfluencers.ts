"use client"

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import type { Influencer, InfluencerFilters, ApiResponse, PaginationParams } from "@/types"
import type { CampaignInfluencer, InfluencerScore } from "@/types/database"

const INFLUENCERS_KEY = "influencers"
const CAMPAIGN_INFLUENCERS_KEY = "campaign-influencers"

// Extended filter type for the UI
export interface ExtendedInfluencerFilters extends InfluencerFilters {
  search?: string
  minScore?: number
  campaignId?: string
}

// Paginated response type
interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchInfluencers(
  filters?: ExtendedInfluencerFilters,
  pagination?: PaginationParams
): Promise<ApiResponse<Influencer[]>> {
  const params = new URLSearchParams()

  if (filters) {
    if (filters.search) params.set("search", filters.search)
    if (filters.platform) params.set("platform", filters.platform)
    if (filters.minFollowers) params.set("minFollowers", filters.minFollowers.toString())
    if (filters.maxFollowers) params.set("maxFollowers", filters.maxFollowers.toString())
    if (filters.minEngagement) params.set("minEngagement", filters.minEngagement.toString())
    if (filters.maxEngagement) params.set("maxEngagement", filters.maxEngagement.toString())
    if (filters.minScore) params.set("minScore", filters.minScore.toString())
    if (filters.niches) params.set("niches", filters.niches.join(","))
    if (filters.location) params.set("location", filters.location)
    if (filters.verified !== undefined) params.set("verified", filters.verified.toString())
    if (filters.campaignId) params.set("campaignId", filters.campaignId)
  }

  if (pagination) {
    if (pagination.page) params.set("page", pagination.page.toString())
    if (pagination.limit) params.set("limit", pagination.limit.toString())
    if (pagination.sort_by) params.set("sort_by", pagination.sort_by)
    if (pagination.sort_order) params.set("sort_order", pagination.sort_order)
  }

  const response = await fetch(`/api/influencers?${params.toString()}`)
  return response.json()
}

async function fetchInfluencersPaginated(
  filters: ExtendedInfluencerFilters | undefined,
  pageParam: number
): Promise<PaginatedResponse<Influencer>> {
  const params = new URLSearchParams()

  if (filters) {
    if (filters.search) params.set("search", filters.search)
    if (filters.platform) params.set("platform", filters.platform)
    if (filters.minFollowers) params.set("minFollowers", filters.minFollowers.toString())
    if (filters.maxFollowers) params.set("maxFollowers", filters.maxFollowers.toString())
    if (filters.minEngagement) params.set("minEngagement", filters.minEngagement.toString())
    if (filters.maxEngagement) params.set("maxEngagement", filters.maxEngagement.toString())
    if (filters.minScore) params.set("minScore", filters.minScore.toString())
    if (filters.niches) params.set("niches", filters.niches.join(","))
    if (filters.location) params.set("location", filters.location)
    if (filters.verified !== undefined) params.set("verified", filters.verified.toString())
    if (filters.campaignId) params.set("campaignId", filters.campaignId)
  }

  params.set("page", pageParam.toString())
  params.set("limit", "20")

  const response = await fetch(`/api/influencers?${params.toString()}`)
  const result = await response.json()

  return {
    data: result.data || [],
    meta: {
      total: result.meta?.total || 0,
      page: pageParam,
      limit: 20,
      hasMore: result.data?.length === 20,
    },
  }
}

async function fetchInfluencer(id: string): Promise<ApiResponse<Influencer>> {
  const response = await fetch(`/api/influencers/${id}`)
  return response.json()
}

async function createInfluencer(data: Partial<Influencer>): Promise<ApiResponse<Influencer>> {
  const response = await fetch("/api/influencers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return response.json()
}

async function updateInfluencer({
  id,
  data,
}: {
  id: string
  data: Partial<Influencer>
}): Promise<ApiResponse<Influencer>> {
  const response = await fetch(`/api/influencers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return response.json()
}

async function deleteInfluencer(id: string): Promise<ApiResponse<null>> {
  const response = await fetch(`/api/influencers/${id}`, {
    method: "DELETE",
  })
  return response.json()
}

// Campaign-specific functions
async function fetchCampaignInfluencers(
  campaignId: string
): Promise<ApiResponse<Array<CampaignInfluencer & { influencer: Influencer }>>> {
  const response = await fetch(`/api/campaigns/${campaignId}/influencers`)
  return response.json()
}

async function addInfluencerToCampaign(params: {
  campaignId: string
  influencerId: string
  stage?: string
  notes?: string
}): Promise<ApiResponse<CampaignInfluencer>> {
  const response = await fetch(`/api/campaigns/${params.campaignId}/influencers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      influencerId: params.influencerId,
      stage: params.stage || "discovered",
      notes: params.notes,
    }),
  })
  return response.json()
}

async function updateCampaignInfluencer(params: {
  campaignId: string
  campaignInfluencerId: string
  data: Partial<CampaignInfluencer>
}): Promise<ApiResponse<CampaignInfluencer>> {
  const response = await fetch(
    `/api/campaigns/${params.campaignId}/influencers/${params.campaignInfluencerId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.data),
    }
  )
  return response.json()
}

async function removeInfluencerFromCampaign(params: {
  campaignId: string
  campaignInfluencerId: string
}): Promise<ApiResponse<null>> {
  const response = await fetch(
    `/api/campaigns/${params.campaignId}/influencers/${params.campaignInfluencerId}`,
    {
      method: "DELETE",
    }
  )
  return response.json()
}

async function bulkAddInfluencersToCampaign(params: {
  campaignId: string
  influencerIds: string[]
  stage?: string
}): Promise<ApiResponse<CampaignInfluencer[]>> {
  const response = await fetch(`/api/campaigns/${params.campaignId}/influencers/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      influencerIds: params.influencerIds,
      stage: params.stage || "discovered",
    }),
  })
  return response.json()
}

// ============================================================================
// Hooks
// ============================================================================

export function useInfluencers(filters?: ExtendedInfluencerFilters) {
  return useQuery({
    queryKey: [INFLUENCERS_KEY, filters],
    queryFn: () => fetchInfluencers(filters),
  })
}

export function useInfluencersInfinite(filters?: ExtendedInfluencerFilters) {
  return useInfiniteQuery({
    queryKey: [INFLUENCERS_KEY, "infinite", filters],
    queryFn: ({ pageParam }) => fetchInfluencersPaginated(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.hasMore) {
        return lastPage.meta.page + 1
      }
      return undefined
    },
  })
}

export function useInfluencer(id: string) {
  return useQuery({
    queryKey: [INFLUENCERS_KEY, id],
    queryFn: () => fetchInfluencer(id),
    enabled: !!id,
  })
}

export function useCreateInfluencer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createInfluencer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INFLUENCERS_KEY] })
    },
  })
}

export function useUpdateInfluencer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateInfluencer,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INFLUENCERS_KEY] })
      queryClient.invalidateQueries({
        queryKey: [INFLUENCERS_KEY, variables.id],
      })
    },
  })
}

export function useDeleteInfluencer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteInfluencer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INFLUENCERS_KEY] })
    },
  })
}

// Campaign influencer hooks
export function useCampaignInfluencers(campaignId: string) {
  return useQuery({
    queryKey: [CAMPAIGN_INFLUENCERS_KEY, campaignId],
    queryFn: () => fetchCampaignInfluencers(campaignId),
    enabled: !!campaignId,
  })
}

export function useAddInfluencerToCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addInfluencerToCampaign,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGN_INFLUENCERS_KEY, variables.campaignId],
      })
    },
  })
}

export function useUpdateCampaignInfluencer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCampaignInfluencer,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGN_INFLUENCERS_KEY, variables.campaignId],
      })
    },
  })
}

export function useRemoveInfluencerFromCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeInfluencerFromCampaign,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGN_INFLUENCERS_KEY, variables.campaignId],
      })
    },
  })
}

export function useBulkAddInfluencersToCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkAddInfluencersToCampaign,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGN_INFLUENCERS_KEY, variables.campaignId],
      })
    },
  })
}

// Export key for external use
export { INFLUENCERS_KEY, CAMPAIGN_INFLUENCERS_KEY }
