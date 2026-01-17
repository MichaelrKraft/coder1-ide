"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react"

export interface InfluencerFilterValues {
  search?: string
  minFollowers?: number
  maxFollowers?: number
  minEngagement?: number
  maxEngagement?: number
  minScore?: number
  niches?: string[]
  verifiedOnly?: boolean
  platform?: string
}

interface InfluencerFiltersProps {
  filters: InfluencerFilterValues
  onFiltersChange: (filters: InfluencerFilterValues) => void
  availableNiches?: string[]
  className?: string
  collapsible?: boolean
}

const FOLLOWER_RANGES = [
  { label: "Any", min: 0, max: 10000000 },
  { label: "Nano (1K-10K)", min: 1000, max: 10000 },
  { label: "Micro (10K-100K)", min: 10000, max: 100000 },
  { label: "Mid (100K-500K)", min: 100000, max: 500000 },
  { label: "Macro (500K-1M)", min: 500000, max: 1000000 },
  { label: "Mega (1M+)", min: 1000000, max: 10000000 },
]

const DEFAULT_NICHES = [
  "Fashion",
  "Beauty",
  "Fitness",
  "Lifestyle",
  "Tech",
  "Food",
  "Travel",
  "Gaming",
  "Music",
  "Art",
  "Business",
  "Education",
  "Entertainment",
  "Sports",
]

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toString()
}

export function InfluencerFilters({
  filters,
  onFiltersChange,
  availableNiches = DEFAULT_NICHES,
  className,
  collapsible = false,
}: InfluencerFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsible)

  const updateFilter = useCallback(
    <K extends keyof InfluencerFilterValues>(
      key: K,
      value: InfluencerFilterValues[K]
    ) => {
      onFiltersChange({ ...filters, [key]: value })
    },
    [filters, onFiltersChange]
  )

  const clearFilters = useCallback(() => {
    onFiltersChange({})
  }, [onFiltersChange])

  const toggleNiche = useCallback(
    (niche: string) => {
      const currentNiches = filters.niches || []
      const newNiches = currentNiches.includes(niche)
        ? currentNiches.filter((n) => n !== niche)
        : [...currentNiches, niche]
      updateFilter("niches", newNiches.length > 0 ? newNiches : undefined)
    },
    [filters.niches, updateFilter]
  )

  // Count active filters
  const activeFilterCount = [
    filters.search,
    filters.minFollowers || filters.maxFollowers,
    filters.minEngagement || filters.maxEngagement,
    filters.minScore,
    filters.niches?.length,
    filters.verifiedOnly,
    filters.platform,
  ].filter(Boolean).length

  const filtersContent = (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-zinc-300">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search by username or name..."
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value || undefined)}
            className="pl-9 bg-zinc-950/50 border-zinc-800 focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Follower Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-zinc-300">
          Follower Range
        </Label>
        <div className="space-y-4">
          <Slider
            value={[filters.minFollowers || 0, filters.maxFollowers || 10000000]}
            min={0}
            max={10000000}
            step={1000}
            onValueChange={([min, max]) => {
              onFiltersChange({
                ...filters,
                minFollowers: min > 0 ? min : undefined,
                maxFollowers: max < 10000000 ? max : undefined,
              })
            }}
          />
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{formatNumber(filters.minFollowers || 0)}</span>
            <span>{formatNumber(filters.maxFollowers || 10000000)}</span>
          </div>
        </div>
        {/* Quick presets */}
        <div className="flex flex-wrap gap-1.5">
          {FOLLOWER_RANGES.map((range) => {
            const isActive =
              (filters.minFollowers === range.min || (!filters.minFollowers && range.min === 0)) &&
              (filters.maxFollowers === range.max || (!filters.maxFollowers && range.max === 10000000))
            return (
              <button
                key={range.label}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    minFollowers: range.min > 0 ? range.min : undefined,
                    maxFollowers: range.max < 10000000 ? range.max : undefined,
                  })
                }
                className={cn(
                  "px-2 py-1 rounded-md text-xs transition-colors",
                  isActive
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                )}
              >
                {range.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Engagement Rate Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-zinc-300">
          Engagement Rate
        </Label>
        <Slider
          value={[filters.minEngagement || 0, filters.maxEngagement || 20]}
          min={0}
          max={20}
          step={0.5}
          onValueChange={([min, max]) => {
            onFiltersChange({
              ...filters,
              minEngagement: min > 0 ? min : undefined,
              maxEngagement: max < 20 ? max : undefined,
            })
          }}
        />
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{(filters.minEngagement || 0).toFixed(1)}%</span>
          <span>{(filters.maxEngagement || 20).toFixed(1)}%</span>
        </div>
      </div>

      {/* Minimum Score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-zinc-300">
            Minimum Score
          </Label>
          <span className="text-sm font-medium text-violet-400">
            {filters.minScore || 0}
          </span>
        </div>
        <Slider
          value={[filters.minScore || 0]}
          min={0}
          max={100}
          step={5}
          onValueChange={([value]) => {
            updateFilter("minScore", value > 0 ? value : undefined)
          }}
        />
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      {/* Niche Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-zinc-300">
          Niches
          {filters.niches?.length ? (
            <span className="ml-2 text-xs text-violet-400">
              ({filters.niches.length} selected)
            </span>
          ) : null}
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {availableNiches.map((niche) => {
            const isSelected = filters.niches?.includes(niche)
            return (
              <button
                key={niche}
                onClick={() => toggleNiche(niche)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs transition-colors",
                  isSelected
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                )}
              >
                {niche}
              </button>
            )
          })}
        </div>
      </div>

      {/* Platform */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-zinc-300">Platform</Label>
        <Select
          value={filters.platform || "all"}
          onValueChange={(value) =>
            updateFilter("platform", value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="bg-zinc-950/50 border-zinc-800">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="twitter">Twitter/X</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Verified Only Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-zinc-300">
          Verified accounts only
        </Label>
        <Switch
          checked={filters.verifiedOnly || false}
          onCheckedChange={(checked) =>
            updateFilter("verifiedOnly", checked || undefined)
          }
        />
      </div>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          onClick={clearFilters}
          className="w-full border-zinc-700 text-zinc-400 hover:bg-zinc-800"
        >
          <X className="h-4 w-4 mr-2" />
          Clear all filters
        </Button>
      )}
    </div>
  )

  if (!collapsible) {
    return (
      <div className={cn("p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50", className)}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-zinc-400" />
            <h3 className="text-base font-semibold text-white">Filters</h3>
          </div>
          {activeFilterCount > 0 && (
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        {filtersContent}
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-zinc-400" />
          <h3 className="text-base font-semibold text-white">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-zinc-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-zinc-400" />
        )}
      </button>
      {isExpanded && <div className="p-5 pt-0 border-t border-zinc-800">{filtersContent}</div>}
    </div>
  )
}

// Horizontal compact filter bar for mobile or inline use
export function InfluencerFiltersBar({
  filters,
  onFiltersChange,
  onOpenFullFilters,
  className,
}: {
  filters: InfluencerFilterValues
  onFiltersChange: (filters: InfluencerFilterValues) => void
  onOpenFullFilters?: () => void
  className?: string
}) {
  const activeFilterCount = [
    filters.search,
    filters.minFollowers || filters.maxFollowers,
    filters.minEngagement || filters.maxEngagement,
    filters.minScore,
    filters.niches?.length,
    filters.verifiedOnly,
    filters.platform,
  ].filter(Boolean).length

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          type="text"
          placeholder="Search influencers..."
          value={filters.search || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value || undefined })
          }
          className="pl-9 bg-zinc-900/50 border-zinc-800"
        />
      </div>

      {onOpenFullFilters && (
        <Button
          variant="outline"
          onClick={onOpenFullFilters}
          className="border-zinc-700 text-zinc-300"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 bg-violet-500 text-white text-xs px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      )}

      {/* Active filter pills */}
      {filters.niches?.map((niche) => (
        <Badge
          key={niche}
          variant="secondary"
          className="bg-violet-500/10 text-violet-400 border-violet-500/30 gap-1 cursor-pointer hover:bg-violet-500/20"
          onClick={() =>
            onFiltersChange({
              ...filters,
              niches: filters.niches?.filter((n) => n !== niche),
            })
          }
        >
          {niche}
          <X className="h-3 w-3" />
        </Badge>
      ))}
    </div>
  )
}
