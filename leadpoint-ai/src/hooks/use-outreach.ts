"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { OutreachMessage } from "@/types/database";
import type {
  GenerateOutreachRequest,
  GenerateOutreachResponse,
  SaveOutreachRequest,
  ImproveMessageRequest,
  ImproveMessageResponse,
} from "@/types/outreach";

// ============================================================================
// Query Keys
// ============================================================================

const OUTREACH_KEYS = {
  all: ["outreach"] as const,
  messages: (campaignId: string) =>
    [...OUTREACH_KEYS.all, "messages", campaignId] as const,
  messagesByInfluencer: (campaignId: string, influencerId: string) =>
    [...OUTREACH_KEYS.messages(campaignId), "influencer", influencerId] as const,
  generate: (campaignId: string) =>
    [...OUTREACH_KEYS.all, "generate", campaignId] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface OutreachFilters {
  influencer_id?: string;
  campaign_influencer_id?: string;
  status?: string;
  message_type?: string;
  page?: number;
  page_size?: number;
}

export interface GenerateOutreachParams {
  campaignId: string;
  request: GenerateOutreachRequest;
}

export interface SaveOutreachParams {
  campaignId: string;
  request: SaveOutreachRequest;
}

export interface UpdateOutreachParams {
  campaignId: string;
  messageId: string;
  status?: string;
  content?: string;
  subject?: string;
  replyContent?: string;
}

export interface ImproveOutreachParams {
  campaignId: string;
  request: ImproveMessageRequest;
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchOutreachMessages(
  campaignId: string,
  filters?: OutreachFilters
): Promise<PaginatedResponse<OutreachMessage>> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.influencer_id)
      params.set("influencer_id", filters.influencer_id);
    if (filters.campaign_influencer_id)
      params.set("campaign_influencer_id", filters.campaign_influencer_id);
    if (filters.status) params.set("status", filters.status);
    if (filters.message_type) params.set("message_type", filters.message_type);
    if (filters.page) params.set("page", filters.page.toString());
    if (filters.page_size) params.set("page_size", filters.page_size.toString());
  }

  const response = await fetch(
    `/api/campaigns/${campaignId}/outreach?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch outreach messages");
  }

  return response.json();
}

async function generateOutreachMessage(
  params: GenerateOutreachParams
): Promise<ApiResponse<GenerateOutreachResponse>> {
  const response = await fetch(
    `/api/campaigns/${params.campaignId}/outreach/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error?.message || "Failed to generate outreach message"
    );
  }

  return response.json();
}

async function saveOutreachMessage(
  params: SaveOutreachParams
): Promise<ApiResponse<OutreachMessage>> {
  const response = await fetch(`/api/campaigns/${params.campaignId}/outreach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params.request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to save outreach message");
  }

  return response.json();
}

async function updateOutreachMessage(
  params: UpdateOutreachParams
): Promise<ApiResponse<OutreachMessage>> {
  const response = await fetch(`/api/campaigns/${params.campaignId}/outreach`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message_id: params.messageId,
      status: params.status,
      content: params.content,
      subject: params.subject,
      reply_content: params.replyContent,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error?.message || "Failed to update outreach message"
    );
  }

  return response.json();
}

async function improveOutreachMessage(
  params: ImproveOutreachParams
): Promise<ApiResponse<ImproveMessageResponse>> {
  const response = await fetch(
    `/api/campaigns/${params.campaignId}/outreach/improve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to improve message");
  }

  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch outreach messages for a campaign
 */
export function useOutreachMessages(
  campaignId: string,
  filters?: OutreachFilters
) {
  return useQuery({
    queryKey: filters?.influencer_id
      ? OUTREACH_KEYS.messagesByInfluencer(campaignId, filters.influencer_id)
      : OUTREACH_KEYS.messages(campaignId),
    queryFn: () => fetchOutreachMessages(campaignId, filters),
    enabled: !!campaignId,
  });
}

/**
 * Hook to generate an AI outreach message
 */
export function useGenerateOutreach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateOutreachMessage,
    onSuccess: (_, variables) => {
      // Optionally invalidate queries or update cache
      queryClient.invalidateQueries({
        queryKey: OUTREACH_KEYS.messages(variables.campaignId),
      });
    },
  });
}

/**
 * Hook to save a draft outreach message
 */
export function useSaveOutreach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveOutreachMessage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: OUTREACH_KEYS.messages(variables.campaignId),
      });
    },
  });
}

/**
 * Hook to update an outreach message (status, content, etc.)
 */
export function useUpdateOutreach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOutreachMessage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: OUTREACH_KEYS.messages(variables.campaignId),
      });
    },
  });
}

/**
 * Hook to mark a message as sent
 */
export function useSendOutreach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { campaignId: string; messageId: string }) =>
      updateOutreachMessage({
        ...params,
        status: "sent",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: OUTREACH_KEYS.messages(variables.campaignId),
      });
    },
  });
}

/**
 * Hook to improve an existing message using AI
 */
export function useImproveOutreach() {
  return useMutation({
    mutationFn: improveOutreachMessage,
  });
}

/**
 * Hook to generate multiple message variations
 */
export function useGenerateVariations() {
  return useMutation({
    mutationFn: async (params: GenerateOutreachParams & { count?: number }) => {
      const response = await generateOutreachMessage({
        ...params,
        request: {
          ...params.request,
          generate_variations: true,
          variation_count: params.count || 3,
        },
      });
      return response;
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get the count of messages by status for a campaign
 */
export function useOutreachStats(campaignId: string) {
  const { data, isLoading, error } = useOutreachMessages(campaignId, {
    page_size: 1000, // Get all for stats
  });

  const stats = {
    total: 0,
    draft: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    replied: 0,
    bounced: 0,
    responseRate: 0,
  };

  if (data?.data) {
    stats.total = data.data.length;
    data.data.forEach((msg) => {
      const status = msg.status as keyof typeof stats;
      if (status in stats && typeof stats[status] === "number") {
        (stats[status] as number)++;
      }
    });

    // Calculate response rate
    const sentMessages = stats.sent + stats.delivered + stats.read + stats.replied;
    stats.responseRate =
      sentMessages > 0 ? (stats.replied / sentMessages) * 100 : 0;
  }

  return {
    stats,
    isLoading,
    error,
  };
}

/**
 * Hook for prefetching outreach messages
 */
export function usePrefetchOutreach(
  campaignId: string,
  influencerId?: string
) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: influencerId
        ? OUTREACH_KEYS.messagesByInfluencer(campaignId, influencerId)
        : OUTREACH_KEYS.messages(campaignId),
      queryFn: () =>
        fetchOutreachMessages(campaignId, { influencer_id: influencerId }),
    });
  };

  return { prefetch };
}

// ============================================================================
// Email-Specific Hooks
// ============================================================================

export interface GenerateEmailOutreachParams {
  campaign_influencer_id: string;
  tone: "casual" | "professional";
  include_offer: boolean;
}

export interface GenerateEmailOutreachResponse {
  subject: string;
  body: string;
  model: string;
}

export interface SendEmailParams {
  campaign_influencer_id: string;
  subject: string;
  body: string;
  reply_to?: string;
}

/**
 * Hook to generate an AI-powered email outreach message
 */
export function useGenerateEmailOutreach() {
  return useMutation({
    mutationFn: async (
      params: GenerateEmailOutreachParams
    ): Promise<GenerateEmailOutreachResponse> => {
      const response = await fetch("/api/outreach/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result: ApiResponse<GenerateEmailOutreachResponse> =
        await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (!result.data) {
        throw new Error("No data returned from email generation");
      }

      return result.data;
    },
  });
}

/**
 * Hook to send an email to an influencer
 */
export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: SendEmailParams
    ): Promise<ApiResponse<OutreachMessage>> => {
      const response = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result: ApiResponse<OutreachMessage> = await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate all outreach queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: OUTREACH_KEYS.all,
      });
    },
  });
}
