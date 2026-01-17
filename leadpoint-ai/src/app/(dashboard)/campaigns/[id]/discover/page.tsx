"use client"

import { useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DiscoveryForm } from "@/components/influencers/discovery-form"
import { InfluencerTable } from "@/components/influencers/influencer-table"
import { InfluencerCard } from "@/components/influencers/influencer-card"
import {
  InfluencerFilters,
  InfluencerFiltersBar,
  type InfluencerFilterValues,
} from "@/components/influencers/influencer-filters"
import { InfluencerDetailPanel } from "@/components/influencers/influencer-detail-panel"
import {
  useDiscovery,
  useCampaign,
  useCampaignInfluencers,
  useAddInfluencerToCampaign,
  useBulkAddInfluencersToCampaign,
  useToast,
} from "@/hooks"
import type { Influencer } from "@/types/database"
import {
  ArrowLeft,
  LayoutGrid,
  List,
  CheckSquare,
  X,
  UserPlus,
  RefreshCw,
  Sparkles,
} from "lucide-react"

type ViewMode = "table" | "grid"

export default function CampaignDiscoverPage() {
  const params = useParams()
  const campaignId = params.id as string
  const { toast } = useToast()

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [showFilters, setShowFilters] = useState(true)
  const [filters, setFilters] = useState<InfluencerFilterValues>({})

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)

  // Data fetching
  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId)

  // Discovery
  const discovery = useDiscovery()

  // Mutations
  const addToCampaign = useAddInfluencerToCampaign()
  const bulkAddToCampaign = useBulkAddInfluencersToCampaign()

  // Get influencers from discovery results
  const discoveredInfluencers = useMemo(() => {
    if (!discovery.results?.influencers) return []

    // Map discovery results to Influencer type
    return discovery.results.influencers.map((inf) => ({
      id: inf.id,
      organization_id: "",
      platform: "tiktok" as const,
      platform_id: inf.username,
      username: inf.username,
      display_name: inf.displayName,
      profile_url: `https://tiktok.com/@${inf.username}`,
      avatar_url: inf.avatarUrl || null,
      bio: null,
      follower_count: inf.followerCount,
      following_count: 0,
      engagement_rate: inf.engagementRate || null,
      average_likes: null,
      average_comments: null,
      average_views: inf.averageViews || null,
      categories: inf.categories || [],
      location: null,
      language: null,
      email: null,
      contact_info: null,
      metrics_updated_at: null,
      ai_analysis: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      campaignInfluencer: null,
    }))
  }, [discovery.results])

  // Filter influencers
  const filteredInfluencers = useMemo(() => {
    let result = discoveredInfluencers

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (inf) =>
          inf.username.toLowerCase().includes(searchLower) ||
          inf.display_name?.toLowerCase().includes(searchLower)
      )
    }

    if (filters.minFollowers) {
      result = result.filter((inf) => inf.follower_count >= filters.minFollowers!)
    }
    if (filters.maxFollowers) {
      result = result.filter((inf) => inf.follower_count <= filters.maxFollowers!)
    }

    if (filters.minEngagement) {
      result = result.filter(
        (inf) => (inf.engagement_rate || 0) >= filters.minEngagement!
      )
    }
    if (filters.maxEngagement) {
      result = result.filter(
        (inf) => (inf.engagement_rate || 0) <= filters.maxEngagement!
      )
    }

    if (filters.niches && filters.niches.length > 0) {
      result = result.filter((inf) =>
        inf.categories?.some((cat) =>
          filters.niches!.some(
            (niche) => niche.toLowerCase() === cat.toLowerCase()
          )
        )
      )
    }

    return result
  }, [discoveredInfluencers, filters])

  // Handlers
  const handleDiscover = useCallback(
    (hashtags: string[], maxResults: number) => {
      discovery.startDiscovery({
        hashtags,
        maxResults,
        campaignId,
        platform: "tiktok",
      })
    },
    [discovery, campaignId]
  )

  const handleCancelDiscovery = useCallback(() => {
    discovery.cancelDiscovery()
  }, [discovery])

  const handleAddToPipeline = useCallback(
    async (influencer: Influencer) => {
      try {
        await addToCampaign.mutateAsync({
          campaignId,
          influencerId: influencer.id,
          stage: "discovered",
        })
        toast({
          title: "Added to pipeline",
          description: `${influencer.display_name || influencer.username} has been added to your campaign.`,
        })
      } catch {
        toast({
          title: "Error",
          description: "Failed to add influencer to campaign.",
          variant: "destructive",
        })
      }
    },
    [campaignId, addToCampaign, toast]
  )

  const handleBulkAddToPipeline = useCallback(async () => {
    if (selectedIds.size === 0) return

    try {
      await bulkAddToCampaign.mutateAsync({
        campaignId,
        influencerIds: Array.from(selectedIds),
        stage: "discovered",
      })
      toast({
        title: "Added to pipeline",
        description: `${selectedIds.size} influencers have been added to your campaign.`,
      })
      setSelectedIds(new Set())
    } catch {
      toast({
        title: "Error",
        description: "Failed to add influencers to campaign.",
        variant: "destructive",
      })
    }
  }, [campaignId, selectedIds, bulkAddToCampaign, toast])

  const handleViewProfile = useCallback((influencer: Influencer) => {
    setSelectedInfluencer(influencer)
    setDetailPanelOpen(true)
  }, [])

  const handleViewTikTok = useCallback((influencer: Influencer) => {
    window.open(influencer.profile_url, "_blank")
  }, [])

  // Loading state
  if (campaignLoading) {
    return <DiscoverPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/campaigns/${campaignId}`}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Campaign</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                viewMode === "table"
                  ? "bg-violet-500/20 text-violet-400"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <List className="h-4 w-4" />
              Table
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                viewMode === "grid"
                  ? "bg-violet-500/20 text-violet-400"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Discover Influencers
                </h1>
                <p className="text-sm text-zinc-400">
                  for{" "}
                  <span className="text-violet-400">
                    {campaign?.data?.name || "Campaign"}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              {filteredInfluencers.length}
            </p>
            <p className="text-sm text-zinc-500">
              {discovery.isCompleted ? "influencers found" : "results"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left Column - Discovery and Results */}
        <div className="space-y-6">
          {/* Discovery Form */}
          <DiscoveryForm
            onDiscover={handleDiscover}
            onCancel={handleCancelDiscovery}
            isLoading={discovery.isLoading}
            progress={discovery.progress}
            estimatedTime={discovery.estimatedTime}
          />

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-violet-500/30 bg-violet-500/5">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-5 w-5 text-violet-400" />
                <span className="text-sm font-medium text-white">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkAddToPipeline}
                  disabled={bulkAddToCampaign.isPending}
                  className="bg-violet-500 hover:bg-violet-600"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add {selectedIds.size} to Pipeline
                </Button>
              </div>
            </div>
          )}

          {/* Filter Bar (Mobile) */}
          <div className="lg:hidden">
            <InfluencerFiltersBar
              filters={filters}
              onFiltersChange={setFilters}
              onOpenFullFilters={() => setShowFilters(true)}
            />
          </div>

          {/* Results Section */}
          {!discovery.isCompleted && !discovery.isLoading && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Ready to discover
              </h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                Enter hashtags above to find influencers that match your
                campaign. We will analyze their content and engagement to find
                the best fits.
              </p>
            </div>
          )}

          {discovery.isLoading && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4 animate-pulse">
                <RefreshCw className="h-6 w-6 text-violet-400 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Discovering influencers...
              </h3>
              <p className="text-sm text-zinc-400">
                This may take a few minutes. We are analyzing profiles and
                calculating scores.
              </p>
            </div>
          )}

          {discovery.isCompleted && filteredInfluencers.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <X className="h-6 w-6 text-zinc-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No results found
              </h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                {Object.keys(filters).length > 0
                  ? "Try adjusting your filters to see more results."
                  : "Try different hashtags or increase the max results."}
              </p>
              {Object.keys(filters).length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setFilters({})}
                  className="mt-4 border-zinc-700"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {discovery.isCompleted && filteredInfluencers.length > 0 && (
            <>
              {viewMode === "table" ? (
                <InfluencerTable
                  influencers={filteredInfluencers}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  onRowClick={handleViewProfile}
                  onAddToPipeline={handleAddToPipeline}
                  onViewProfile={handleViewTikTok}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredInfluencers.map((influencer) => (
                    <InfluencerCard
                      key={influencer.id}
                      influencer={influencer}
                      isSelected={selectedIds.has(influencer.id)}
                      onSelect={(selected) => {
                        const newSelection = new Set(selectedIds)
                        if (selected) {
                          newSelection.add(influencer.id)
                        } else {
                          newSelection.delete(influencer.id)
                        }
                        setSelectedIds(newSelection)
                      }}
                      onAddToPipeline={handleAddToPipeline}
                      onViewProfile={handleViewProfile}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column - Filters */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <InfluencerFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <InfluencerDetailPanel
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        influencer={selectedInfluencer}
        onAddToCampaign={handleAddToPipeline}
        onViewTikTok={handleViewTikTok}
      />
    </div>
  )
}

function DiscoverPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-2xl hidden lg:block" />
      </div>
    </div>
  )
}
