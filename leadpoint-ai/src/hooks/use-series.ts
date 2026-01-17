"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ViralSeries, SeriesVideo, SeriesVariation } from '@/types/database'

interface SeriesAnalysisResponse {
  series: ViralSeries
  videos: SeriesVideo[]
  topPerformer: SeriesVideo | null
  performanceTrend: 'improving' | 'declining' | 'stable'
  suggestedVariations: SeriesVariation[]
  healthScore: number
  healthStatus: 'thriving' | 'stable' | 'needs_attention' | 'declining'
}

// Get all series for a campaign
export function useCampaignSeries(campaignId: string) {
  return useQuery({
    queryKey: ['series', 'campaign', campaignId],
    queryFn: async (): Promise<ViralSeries[]> => {
      const res = await fetch(`/api/campaigns/${campaignId}/series`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || json.error)
      return json.data
    },
    enabled: !!campaignId,
  })
}

// Get detailed series analysis
export function useSeriesAnalysis(seriesId: string) {
  return useQuery({
    queryKey: ['series', seriesId, 'analysis'],
    queryFn: async (): Promise<SeriesAnalysisResponse> => {
      const res = await fetch(`/api/series/${seriesId}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || json.error)
      return json.data
    },
    enabled: !!seriesId,
  })
}

// Generate new variations for a series
export function useGenerateVariations(seriesId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (count: number = 5): Promise<SeriesVariation[]> => {
      const res = await fetch(`/api/series/${seriesId}/variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] })
    },
  })
}

// Create a new series
export function useCreateSeries(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      influencerId: string
      formatType: ViralSeries['format_type']
      hookPattern?: string
    }): Promise<ViralSeries> => {
      const res = await fetch(`/api/campaigns/${campaignId}/series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series', 'campaign', campaignId] })
    },
  })
}

// Add video to series
export function useAddSeriesVideo(seriesId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      videoUrl: string
      title?: string
      variationType: SeriesVideo['variation_type']
    }): Promise<SeriesVideo> => {
      const res = await fetch(`/api/series/${seriesId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] })
    },
  })
}

// Update variation status
export function useUpdateVariationStatus(seriesId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ variationId, status }: {
      variationId: string
      status: SeriesVariation['status']
    }): Promise<SeriesVariation> => {
      const res = await fetch(`/api/series/${seriesId}/variations/${variationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] })
    },
  })
}
