"use client"

import * as React from "react"
import { useParams } from 'next/navigation'
import { useCampaignSeries, useSeriesAnalysis, useGenerateVariations, useUpdateVariationStatus } from '@/hooks/use-series'
import { SeriesCard, SeriesCardSkeleton } from '@/components/series'
import { SeriesDetail } from '@/components/series'
import { Button } from "@/components/ui/button"
import { Sparkles, Plus, ArrowLeft } from "lucide-react"

export default function SeriesPage() {
  const params = useParams()
  const campaignId = params.id as string

  const [selectedSeriesId, setSelectedSeriesId] = React.useState<string | null>(null)

  const { data: seriesList, isLoading: loadingSeries } = useCampaignSeries(campaignId)
  const { data: seriesAnalysis, isLoading: loadingAnalysis } = useSeriesAnalysis(selectedSeriesId || '')
  const generateVariations = useGenerateVariations(selectedSeriesId || '')
  const updateStatus = useUpdateVariationStatus(selectedSeriesId || '')

  const handleGenerateVariations = () => {
    generateVariations.mutate(5)
  }

  const handleApproveVariation = (variationId: string) => {
    updateStatus.mutate({ variationId, status: 'approved' })
  }

  const handleRejectVariation = (variationId: string) => {
    updateStatus.mutate({ variationId, status: 'rejected' })
  }

  // Show series detail if one is selected
  if (selectedSeriesId && seriesAnalysis) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSeriesId(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Series
          </Button>
          <h1 className="text-2xl font-bold text-white">{seriesAnalysis.series.name}</h1>
        </div>

        <SeriesDetail
          series={seriesAnalysis.series}
          videos={seriesAnalysis.videos}
          variations={seriesAnalysis.suggestedVariations}
          healthScore={seriesAnalysis.healthScore}
          healthStatus={seriesAnalysis.healthStatus}
          onGenerateVariations={handleGenerateVariations}
          onApproveVariation={handleApproveVariation}
          onRejectVariation={handleRejectVariation}
          isGenerating={generateVariations.isPending}
        />
      </div>
    )
  }

  // Show loading state for series detail
  if (selectedSeriesId && loadingAnalysis) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Viral Series</h1>
          <p className="text-zinc-400 mt-1">
            Track and extend your viral video series - &quot;If a video works, make 10 more versions&quot;
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Series
        </Button>
      </div>

      {loadingSeries ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SeriesCardSkeleton key={i} />
          ))}
        </div>
      ) : seriesList && seriesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seriesList.map(series => (
            <SeriesCard
              key={series.id}
              series={series}
              healthScore={75} // TODO: Calculate from API
              healthStatus="stable"
              onClick={() => setSelectedSeriesId(series.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <Sparkles className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No Series Yet</h2>
          <p className="text-zinc-400 mb-4">
            Create your first viral series to start tracking performance and generating variations
          </p>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Series
          </Button>
        </div>
      )}
    </div>
  )
}
