"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { ContentBrief } from "@/types/database";

// ============================================================================
// Query Keys
// ============================================================================

export const BRIEFS_KEYS = {
  all: ["briefs"] as const,
  lists: () => [...BRIEFS_KEYS.all, "list"] as const,
  list: (filters: BriefFilters) => [...BRIEFS_KEYS.lists(), filters] as const,
  details: () => [...BRIEFS_KEYS.all, "detail"] as const,
  detail: (id: string) => [...BRIEFS_KEYS.details(), id] as const,
  byCampaign: (campaignId: string) =>
    [...BRIEFS_KEYS.all, "campaign", campaignId] as const,
  byInfluencer: (influencerId: string) =>
    [...BRIEFS_KEYS.all, "influencer", influencerId] as const,
  byCampaignInfluencer: (campaignInfluencerId: string) =>
    [...BRIEFS_KEYS.all, "campaign-influencer", campaignInfluencerId] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface BriefFilters {
  campaign_id?: string;
  influencer_id?: string;
  campaign_influencer_id?: string;
  status?: ContentBrief["status"];
  page?: number;
  page_size?: number;
}

export interface GenerateBriefRequest {
  campaign_influencer_id: string;
  product_info?: {
    name: string;
    description: string;
    key_benefits: string[];
    target_audience?: string;
  };
  brand_guidelines?: string;
  restrictions?: string[];
  preferred_format?: ContentBrief["format_suggestion"];
}

export interface GenerateBriefResponse {
  brief: ContentBrief;
  metadata: {
    model: string;
    generated_at: string;
    tokens_used: number;
    is_mock?: boolean;
  };
}

export interface UpdateBriefRequest {
  title?: string;
  hook_options?: string[];
  talking_points?: string[];
  call_to_action?: string;
  restrictions?: string[];
  dos_and_donts?: { dos: string[]; donts: string[] };
  estimated_duration?: string;
  format_suggestion?: ContentBrief["format_suggestion"];
  status?: ContentBrief["status"];
}

export interface RegenerateSectionRequest {
  section: "hooks" | "talking_points" | "cta" | "dos_donts" | "product_mentions";
  feedback?: string;
}

export interface RegenerateSectionResponse {
  updated_fields: Partial<ContentBrief>;
  metadata: {
    model: string;
    generated_at: string;
    tokens_used: number;
    is_mock?: boolean;
  };
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchBriefs(
  filters?: BriefFilters
): Promise<PaginatedResponse<ContentBrief>> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.campaign_id) params.set("campaign_id", filters.campaign_id);
    if (filters.influencer_id) params.set("influencer_id", filters.influencer_id);
    if (filters.campaign_influencer_id)
      params.set("campaign_influencer_id", filters.campaign_influencer_id);
    if (filters.status) params.set("status", filters.status);
    if (filters.page) params.set("page", filters.page.toString());
    if (filters.page_size) params.set("page_size", filters.page_size.toString());
  }

  const response = await fetch(`/api/briefs?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch briefs");
  }

  return response.json();
}

async function fetchBrief(id: string): Promise<ApiResponse<ContentBrief>> {
  const response = await fetch(`/api/briefs/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch brief");
  }

  return response.json();
}

async function generateBrief(
  request: GenerateBriefRequest
): Promise<ApiResponse<GenerateBriefResponse>> {
  const response = await fetch("/api/briefs/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to generate brief");
  }

  return response.json();
}

async function updateBrief(
  id: string,
  request: UpdateBriefRequest
): Promise<ApiResponse<ContentBrief>> {
  const response = await fetch(`/api/briefs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to update brief");
  }

  return response.json();
}

async function regenerateSection(
  id: string,
  request: RegenerateSectionRequest
): Promise<ApiResponse<RegenerateSectionResponse>> {
  const response = await fetch(`/api/briefs/${id}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to regenerate section");
  }

  return response.json();
}

async function deleteBrief(id: string): Promise<ApiResponse<null>> {
  const response = await fetch(`/api/briefs/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to delete brief");
  }

  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all briefs with optional filters
 */
export function useBriefs(filters?: BriefFilters) {
  return useQuery({
    queryKey: BRIEFS_KEYS.list(filters || {}),
    queryFn: () => fetchBriefs(filters),
  });
}

/**
 * Hook to fetch briefs for a specific campaign
 */
export function useCampaignBriefs(campaignId: string) {
  return useQuery({
    queryKey: BRIEFS_KEYS.byCampaign(campaignId),
    queryFn: () => fetchBriefs({ campaign_id: campaignId }),
    enabled: !!campaignId,
  });
}

/**
 * Hook to fetch briefs for a specific campaign-influencer relationship
 */
export function useCampaignInfluencerBriefs(campaignInfluencerId: string) {
  return useQuery({
    queryKey: BRIEFS_KEYS.byCampaignInfluencer(campaignInfluencerId),
    queryFn: () => fetchBriefs({ campaign_influencer_id: campaignInfluencerId }),
    enabled: !!campaignInfluencerId,
  });
}

/**
 * Hook to fetch a single brief by ID
 */
export function useBrief(id: string) {
  return useQuery({
    queryKey: BRIEFS_KEYS.detail(id),
    queryFn: () => fetchBrief(id),
    enabled: !!id,
    select: (response) => response.data,
  });
}

/**
 * Hook to generate a new content brief
 */
export function useGenerateBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateBrief,
    onSuccess: (response, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: BRIEFS_KEYS.all });

      // If we have the campaign_influencer_id, invalidate specific query
      if (variables.campaign_influencer_id) {
        queryClient.invalidateQueries({
          queryKey: BRIEFS_KEYS.byCampaignInfluencer(variables.campaign_influencer_id),
        });
      }
    },
  });
}

/**
 * Hook to update an existing brief
 */
export function useUpdateBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...request }: { id: string } & UpdateBriefRequest) =>
      updateBrief(id, request),
    onSuccess: (response, variables) => {
      // Update the cache directly
      if (response.data) {
        queryClient.setQueryData(
          BRIEFS_KEYS.detail(variables.id),
          response
        );
      }
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: BRIEFS_KEYS.lists() });
    },
  });
}

/**
 * Hook to regenerate a specific section of a brief
 */
export function useRegenerateBriefSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      briefId,
      ...request
    }: { briefId: string } & RegenerateSectionRequest) =>
      regenerateSection(briefId, request),
    onSuccess: (response, variables) => {
      // Invalidate the specific brief to refetch
      queryClient.invalidateQueries({
        queryKey: BRIEFS_KEYS.detail(variables.briefId),
      });
    },
  });
}

/**
 * Hook to delete a brief
 */
export function useDeleteBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBrief,
    onSuccess: (_, briefId) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: BRIEFS_KEYS.detail(briefId) });
      queryClient.invalidateQueries({ queryKey: BRIEFS_KEYS.lists() });
    },
  });
}

/**
 * Hook to update brief status
 */
export function useUpdateBriefStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentBrief["status"] }) =>
      updateBrief(id, { status }),
    onSuccess: (response, variables) => {
      if (response.data) {
        queryClient.setQueryData(
          BRIEFS_KEYS.detail(variables.id),
          response
        );
      }
      queryClient.invalidateQueries({ queryKey: BRIEFS_KEYS.lists() });
    },
  });
}

/**
 * Hook to send a brief to an influencer (updates status to 'sent')
 */
export function useSendBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => updateBrief(id, { status: "sent" }),
    onSuccess: (response, id) => {
      if (response.data) {
        queryClient.setQueryData(BRIEFS_KEYS.detail(id), response);
      }
      queryClient.invalidateQueries({ queryKey: BRIEFS_KEYS.lists() });
    },
  });
}

/**
 * Hook for prefetching a brief
 */
export function usePrefetchBrief() {
  const queryClient = useQueryClient();

  const prefetch = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: BRIEFS_KEYS.detail(id),
      queryFn: () => fetchBrief(id),
    });
  };

  return { prefetch };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get brief stats for a campaign
 */
export function useBriefStats(campaignId: string) {
  const { data, isLoading, error } = useCampaignBriefs(campaignId);

  const stats = {
    total: 0,
    draft: 0,
    sent: 0,
    approved: 0,
    revision_requested: 0,
    content_submitted: 0,
  };

  if (data?.data) {
    stats.total = data.data.length;
    data.data.forEach((brief) => {
      if (brief.status in stats) {
        (stats[brief.status as keyof typeof stats] as number)++;
      }
    });
  }

  return {
    stats,
    isLoading,
    error,
  };
}
