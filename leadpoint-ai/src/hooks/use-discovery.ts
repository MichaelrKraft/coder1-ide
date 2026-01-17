"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

// Types
export interface DiscoveryParams {
  hashtags: string[]
  maxResults: number
  platform?: string
  campaignId?: string
}

export interface DiscoveryJob {
  id: string
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  progress: number
  estimatedTimeRemaining?: string
  resultsCount?: number
  error?: string
  createdAt: string
  completedAt?: string
}

export interface DiscoveryResult {
  jobId: string
  influencers: Array<{
    id: string
    username: string
    displayName: string
    avatarUrl?: string
    followerCount: number
    engagementRate?: number
    averageViews?: number
    categories?: string[]
    score?: number
  }>
  total: number
  hashtags: string[]
}

// API functions
async function startDiscovery(params: DiscoveryParams): Promise<{ jobId: string }> {
  const response = await fetch("/api/discovery/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to start discovery")
  }

  return response.json()
}

async function fetchJobStatus(jobId: string): Promise<DiscoveryJob> {
  const response = await fetch(`/api/discovery/jobs/${jobId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to fetch job status")
  }

  return response.json()
}

async function cancelDiscoveryJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/discovery/jobs/${jobId}/cancel`, {
    method: "POST",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to cancel job")
  }
}

async function fetchDiscoveryResults(jobId: string): Promise<DiscoveryResult> {
  const response = await fetch(`/api/discovery/jobs/${jobId}/results`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to fetch results")
  }

  return response.json()
}

// Hooks
export function useDiscoverInfluencers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: startDiscovery,
    onSuccess: () => {
      // Invalidate relevant queries when discovery starts
      queryClient.invalidateQueries({ queryKey: ["discovery-jobs"] })
    },
  })
}

export function useDiscoveryJob(jobId: string | null) {
  const [isPolling, setIsPolling] = useState(true)

  const query = useQuery({
    queryKey: ["discovery-job", jobId],
    queryFn: () => fetchJobStatus(jobId!),
    enabled: !!jobId && isPolling,
    refetchInterval: (query) => {
      const data = query.state.data
      // Stop polling if job is completed, failed, or cancelled
      if (data?.status === "completed" || data?.status === "failed" || data?.status === "cancelled") {
        setIsPolling(false)
        return false
      }
      // Poll every 2 seconds while running
      return 2000
    },
  })

  // Reset polling state when jobId changes
  useEffect(() => {
    if (jobId) {
      setIsPolling(true)
    }
  }, [jobId])

  return {
    ...query,
    isPolling,
    stopPolling: () => setIsPolling(false),
    startPolling: () => setIsPolling(true),
  }
}

export function useCancelDiscovery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelDiscoveryJob,
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["discovery-job", jobId] })
    },
  })
}

export function useDiscoveryResults(jobId: string | null) {
  return useQuery({
    queryKey: ["discovery-results", jobId],
    queryFn: () => fetchDiscoveryResults(jobId!),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Combined discovery hook for easier usage
export function useDiscovery() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const startMutation = useDiscoverInfluencers()
  const cancelMutation = useCancelDiscovery()
  const jobQuery = useDiscoveryJob(currentJobId)
  const resultsQuery = useDiscoveryResults(
    jobQuery.data?.status === "completed" ? currentJobId : null
  )

  const startDiscovery = useCallback(
    async (params: DiscoveryParams) => {
      try {
        const { jobId } = await startMutation.mutateAsync(params)
        setCurrentJobId(jobId)
        return jobId
      } catch (error) {
        throw error
      }
    },
    [startMutation]
  )

  const cancelDiscovery = useCallback(async () => {
    if (currentJobId) {
      await cancelMutation.mutateAsync(currentJobId)
    }
  }, [currentJobId, cancelMutation])

  const reset = useCallback(() => {
    setCurrentJobId(null)
    queryClient.removeQueries({ queryKey: ["discovery-job", currentJobId] })
    queryClient.removeQueries({ queryKey: ["discovery-results", currentJobId] })
  }, [currentJobId, queryClient])

  // Computed state
  const isLoading = startMutation.isPending || (jobQuery.data?.status === "running")
  const isCompleted = jobQuery.data?.status === "completed"
  const isFailed = jobQuery.data?.status === "failed"
  const isCancelled = jobQuery.data?.status === "cancelled"
  const progress = jobQuery.data?.progress ?? 0
  const estimatedTime = jobQuery.data?.estimatedTimeRemaining
  const error = jobQuery.data?.error || startMutation.error?.message

  return {
    // Actions
    startDiscovery,
    cancelDiscovery,
    reset,

    // State
    jobId: currentJobId,
    job: jobQuery.data,
    results: resultsQuery.data,
    isLoading,
    isCompleted,
    isFailed,
    isCancelled,
    progress,
    estimatedTime,
    error,

    // Mutation states
    isStarting: startMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isLoadingResults: resultsQuery.isLoading,
  }
}

// Estimate discovery time based on parameters
export function estimateDiscoveryTime(maxResults: number): string {
  const baseTimePerResult = 0.5 // seconds
  const overheadTime = 30 // seconds
  const totalSeconds = Math.ceil(maxResults * baseTimePerResult + overheadTime)

  if (totalSeconds < 60) {
    return `~${totalSeconds} seconds`
  }

  const minutes = Math.ceil(totalSeconds / 60)
  return `~${minutes} minute${minutes > 1 ? "s" : ""}`
}
