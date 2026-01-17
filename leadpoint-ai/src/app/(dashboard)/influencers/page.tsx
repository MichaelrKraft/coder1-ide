"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InfluencerTable } from "@/components/influencers/influencer-table"
import { InfluencerCard } from "@/components/influencers/influencer-card"
import {
  InfluencerFilters,
  InfluencerFiltersBar,
  type InfluencerFilterValues,
} from "@/components/influencers/influencer-filters"
import { InfluencerDetailPanel } from "@/components/influencers/influencer-detail-panel"
import {
  useInfluencers,
  useCampaigns,
  useAddInfluencerToCampaign,
  useToast,
  type ExtendedInfluencerFilters,
} from "@/hooks"
import type { Influencer } from "@/types/database"
import {
  Users,
  LayoutGrid,
  List,
  Download,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Megaphone,
} from "lucide-react"

type ViewMode = "table" | "grid"

export default function InfluencersPage() {
  const { toast } = useToast()

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [showFilters, setShowFilters] = useState(true)
  const [filters, setFilters] = useState<InfluencerFilterValues>({})
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all")
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)

  // Build query filters
  const queryFilters: ExtendedInfluencerFilters = useMemo(() => {
    const result: ExtendedInfluencerFilters = {}

    if (filters.search) result.search = filters.search
    if (filters.minFollowers) result.minFollowers = filters.minFollowers
    if (filters.maxFollowers) result.maxFollowers = filters.maxFollowers
    if (filters.minEngagement) result.minEngagement = filters.minEngagement
    if (filters.maxEngagement) result.maxEngagement = filters.maxEngagement
    if (filters.minScore) result.minScore = filters.minScore
    if (filters.niches && filters.niches.length > 0) result.niches = filters.niches
    if (filters.verifiedOnly) result.verified = filters.verifiedOnly
    if (filters.platform) result.platform = filters.platform as "instagram" | "tiktok" | "youtube" | "twitter"
    if (selectedCampaignId && selectedCampaignId !== "all") {
      result.campaignId = selectedCampaignId
    }

    return result
  }, [filters, selectedCampaignId])

  // Data fetching
  const { data: influencersResponse, isLoading, refetch } = useInfluencers(queryFilters)
  const { data: campaignsResponse } = useCampaigns({})

  const influencers = influencersResponse?.data || []
  const campaigns = campaignsResponse?.data || []
  const totalInfluencers = influencersResponse?.meta?.total || influencers.length

  // Mutations
  const addToCampaign = useAddInfluencerToCampaign()

  // Pagination
  const paginatedInfluencers = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return influencers.slice(startIndex, startIndex + pageSize)
  }, [influencers, page])

  // Handlers
  const handleAddToPipeline = useCallback(
    async (influencer: Influencer) => {
      if (!selectedCampaignId || selectedCampaignId === "all") {
        toast({
          title: "Select a campaign",
          description: "Please select a campaign to add the influencer to.",
          variant: "destructive",
        })
        return
      }

      try {
        await addToCampaign.mutateAsync({
          campaignId: selectedCampaignId,
          influencerId: influencer.id,
          stage: "discovered",
        })
        toast({
          title: "Added to campaign",
          description: `${influencer.display_name || influencer.username} has been added to the campaign.`,
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add influencer to campaign.",
          variant: "destructive",
        })
      }
    },
    [selectedCampaignId, addToCampaign, toast]
  )

  const handleViewProfile = useCallback((influencer: Influencer) => {
    setSelectedInfluencer(influencer)
    setDetailPanelOpen(true)
  }, [])

  const handleViewExternal = useCallback((influencer: Influencer) => {
    window.open(influencer.profile_url, "_blank")
  }, [])

  const handleExport = useCallback(() => {
    // Placeholder for export functionality
    toast({
      title: "Export started",
      description: "Your influencer data is being exported...",
    })
  }, [toast])

  // Calculate stats
  const stats = useMemo(() => {
    if (!influencers.length) return null

    const totalFollowers = influencers.reduce((sum, inf) => sum + inf.follower_count, 0)
    const avgEngagement = influencers.reduce((sum, inf) => sum + (inf.engagement_rate || 0), 0) / influencers.length

    return {
      total: totalInfluencers,
      totalFollowers,
      avgEngagement,
    }
  }, [influencers, totalInfluencers])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 shadow-inner shadow-black/20">
              <Users className="h-5 w-5 text-slate-300" />
            </div>
            Influencer Database
          </h1>
          <p className="mt-1 text-zinc-400">
            Browse and manage all your discovered influencers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/campaigns">
            <Button className={cn(
              "relative overflow-hidden",
              "bg-gradient-to-b from-violet-400 via-violet-500 to-purple-600",
              "text-white font-semibold",
              "shadow-lg shadow-violet-500/30",
              "hover:shadow-xl hover:shadow-violet-500/40",
              "hover:from-violet-500 hover:via-violet-600 hover:to-purple-700",
              "transition-all duration-300",
              // Glossy shine effect
              "before:absolute before:inset-0",
              "before:bg-gradient-to-b before:from-white/25 before:via-white/5 before:to-transparent",
              "before:rounded-[inherit]",
              // Inner highlight
              "after:absolute after:inset-[1px] after:rounded-[inherit]",
              "after:bg-gradient-to-b after:from-white/10 after:to-transparent after:opacity-0",
              "hover:after:opacity-100 after:transition-opacity",
              // Border glow
              "ring-1 ring-white/10",
            )}>
              <Plus className="h-4 w-4 mr-2 relative z-10" />
              <span className="relative z-10">New Discovery</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 shadow-inner shadow-black/20 group-hover:border-slate-600/50 transition-all duration-300">
                <Users className="h-5 w-5 text-slate-300 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats.total.toLocaleString()}
                </p>
                <p className="text-sm text-zinc-500">Total Influencers</p>
              </div>
            </div>
          </div>
          <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 shadow-inner shadow-black/20 group-hover:border-slate-600/50 transition-all duration-300">
                <TrendingUp className="h-5 w-5 text-slate-300 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatNumber(stats.totalFollowers)}
                </p>
                <p className="text-sm text-zinc-500">Total Reach</p>
              </div>
            </div>
          </div>
          <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 shadow-inner shadow-black/20 group-hover:border-slate-600/50 transition-all duration-300">
                <TrendingUp className="h-5 w-5 text-slate-300 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats.avgEngagement.toFixed(1)}%
                </p>
                <p className="text-sm text-zinc-500">Avg Engagement</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
        {/* Campaign Filter */}
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-zinc-500" />
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger className="w-[200px] bg-zinc-950/50 border-zinc-800">
              <SelectValue placeholder="Filter by campaign" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="flex-1">
          <InfluencerFiltersBar
            filters={filters}
            onFiltersChange={setFilters}
            onOpenFullFilters={() => setShowFilters(!showFilters)}
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-zinc-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950/50 p-1">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-md text-sm transition-colors",
                viewMode === "table"
                  ? "bg-violet-500/20 text-violet-400"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-md text-sm transition-colors",
                viewMode === "grid"
                  ? "bg-violet-500/20 text-violet-400"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left - Results */}
        <div className="space-y-6">
          {isLoading ? (
            <InfluencersTableSkeleton />
          ) : influencers.length === 0 ? (
            <EmptyState hasFilters={Object.keys(filters).length > 0} onClearFilters={() => setFilters({})} />
          ) : (
            <>
              {viewMode === "table" ? (
                <InfluencerTable
                  influencers={paginatedInfluencers.map((inf) => ({
                    ...inf,
                    campaignInfluencer: null,
                  }))}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  onRowClick={handleViewProfile}
                  onAddToPipeline={selectedCampaignId !== "all" ? handleAddToPipeline : undefined}
                  onViewProfile={handleViewExternal}
                  pagination={{
                    page,
                    pageSize,
                    total: totalInfluencers,
                    onPageChange: setPage,
                  }}
                />
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {paginatedInfluencers.map((influencer) => (
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
                        onAddToPipeline={selectedCampaignId !== "all" ? handleAddToPipeline : undefined}
                        onViewProfile={handleViewProfile}
                      />
                    ))}
                  </div>
                  {/* Grid Pagination */}
                  {totalInfluencers > pageSize && (
                    <div className="flex items-center justify-between px-2">
                      <p className="text-sm text-zinc-500">
                        Showing {(page - 1) * pageSize + 1} to{" "}
                        {Math.min(page * pageSize, totalInfluencers)} of {totalInfluencers}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="border-zinc-700"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => p + 1)}
                          disabled={page * pageSize >= totalInfluencers}
                          className="border-zinc-700"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Right - Filters (Desktop) */}
        {showFilters && (
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <InfluencerFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <InfluencerDetailPanel
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        influencer={selectedInfluencer}
        onAddToCampaign={selectedCampaignId !== "all" ? handleAddToPipeline : undefined}
        onViewTikTok={handleViewExternal}
      />
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean
  onClearFilters: () => void
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <Users className="h-6 w-6 text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {hasFilters ? "No matching influencers" : "No influencers yet"}
      </h3>
      <p className="text-sm text-zinc-400 max-w-sm mx-auto mb-6">
        {hasFilters
          ? "Try adjusting your filters to see more results."
          : "Start a discovery search from a campaign to find and add influencers to your database."}
      </p>
      {hasFilters ? (
        <Button variant="outline" onClick={onClearFilters} className="border-zinc-700">
          Clear Filters
        </Button>
      ) : (
        <Link href="/campaigns">
          <Button className={cn(
            "relative overflow-hidden",
            "bg-gradient-to-b from-violet-400 via-violet-500 to-purple-600",
            "text-white font-semibold",
            "shadow-lg shadow-violet-500/30",
            "hover:shadow-xl hover:shadow-violet-500/40",
            "hover:from-violet-500 hover:via-violet-600 hover:to-purple-700",
            "transition-all duration-300",
            // Glossy shine effect
            "before:absolute before:inset-0",
            "before:bg-gradient-to-b before:from-white/25 before:via-white/5 before:to-transparent",
            "before:rounded-[inherit]",
            // Inner highlight
            "after:absolute after:inset-[1px] after:rounded-[inherit]",
            "after:bg-gradient-to-b after:from-white/10 after:to-transparent after:opacity-0",
            "hover:after:opacity-100 after:transition-opacity",
            // Border glow
            "ring-1 ring-white/10",
          )}>
            <Search className="h-4 w-4 mr-2 relative z-10" />
            <span className="relative z-10">Start Discovery</span>
          </Button>
        </Link>
      )}
    </div>
  )
}

function InfluencersTableSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border-b border-zinc-800 last:border-0">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-10 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
