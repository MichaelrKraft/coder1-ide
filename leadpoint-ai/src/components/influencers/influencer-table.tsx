"use client"

import * as React from "react"
import { useState, useMemo, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScoreBadgeInline } from "./score-badge"
import type { Influencer, CampaignInfluencer, InfluencerScore } from "@/types/database"
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ExternalLink,
  UserPlus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react"

interface InfluencerWithScore extends Influencer {
  campaignInfluencer?: CampaignInfluencer | null
}

interface InfluencerTableProps {
  influencers: InfluencerWithScore[]
  isLoading?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  onRowClick?: (influencer: Influencer) => void
  onAddToPipeline?: (influencer: Influencer) => void
  onViewProfile?: (influencer: Influencer) => void
  onAddNotes?: (influencer: Influencer) => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  className?: string
}

type SortField = "display_name" | "follower_count" | "engagement_rate" | "score"
type SortDirection = "asc" | "desc"

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export function InfluencerTable({
  influencers,
  isLoading = false,
  selectedIds = new Set(),
  onSelectionChange,
  onRowClick,
  onAddToPipeline,
  onViewProfile,
  onAddNotes,
  pagination,
  className,
}: InfluencerTableProps) {
  const [sortField, setSortField] = useState<SortField>("follower_count")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }, [sortField])

  // Sort influencers
  const sortedInfluencers = useMemo(() => {
    return [...influencers].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "display_name":
          comparison = (a.display_name || a.username).localeCompare(
            b.display_name || b.username
          )
          break
        case "follower_count":
          comparison = a.follower_count - b.follower_count
          break
        case "engagement_rate":
          comparison = (a.engagement_rate || 0) - (b.engagement_rate || 0)
          break
        case "score":
          comparison =
            (a.campaignInfluencer?.score?.overall || 0) -
            (b.campaignInfluencer?.score?.overall || 0)
          break
      }

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [influencers, sortField, sortDirection])

  // Handle selection
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (onSelectionChange) {
        if (checked) {
          onSelectionChange(new Set(influencers.map((i) => i.id)))
        } else {
          onSelectionChange(new Set())
        }
      }
    },
    [influencers, onSelectionChange]
  )

  const handleSelectOne = useCallback(
    (id: string, checked: boolean) => {
      if (onSelectionChange) {
        const newSelection = new Set(selectedIds)
        if (checked) {
          newSelection.add(id)
        } else {
          newSelection.delete(id)
        }
        onSelectionChange(newSelection)
      }
    },
    [selectedIds, onSelectionChange]
  )

  const allSelected =
    influencers.length > 0 && influencers.every((i) => selectedIds.has(i.id))
  const someSelected =
    influencers.some((i) => selectedIds.has(i.id)) && !allSelected

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-zinc-600" />
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 text-violet-400" />
    ) : (
      <ChevronDown className="h-4 w-4 text-violet-400" />
    )
  }

  if (isLoading) {
    return <InfluencerTableSkeleton />
  }

  if (influencers.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <svg
            className="h-6 w-6 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          No influencers found
        </h3>
        <p className="text-sm text-zinc-400 max-w-sm mx-auto">
          Run a discovery search to find influencers that match your criteria,
          or adjust your filters.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className={someSelected ? "data-[state=checked]:bg-violet-600" : ""}
                  />
                </TableHead>
              )}
              <TableHead className="min-w-[250px]">
                <button
                  onClick={() => handleSort("display_name")}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  Influencer
                  <SortIcon field="display_name" />
                </button>
              </TableHead>
              <TableHead className="w-32">
                <button
                  onClick={() => handleSort("follower_count")}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  Followers
                  <SortIcon field="follower_count" />
                </button>
              </TableHead>
              <TableHead className="w-32">
                <button
                  onClick={() => handleSort("engagement_rate")}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  Engagement
                  <SortIcon field="engagement_rate" />
                </button>
              </TableHead>
              <TableHead className="w-24">
                <button
                  onClick={() => handleSort("score")}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  Score
                  <SortIcon field="score" />
                </button>
              </TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInfluencers.map((influencer) => {
              const isSelected = selectedIds.has(influencer.id)
              const score = influencer.campaignInfluencer?.score?.overall || 0

              return (
                <TableRow
                  key={influencer.id}
                  className={cn(
                    "border-zinc-800 cursor-pointer transition-colors",
                    isSelected && "bg-violet-500/5"
                  )}
                  onClick={() => onRowClick?.(influencer)}
                >
                  {onSelectionChange && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectOne(influencer.id, checked as boolean)
                        }
                        aria-label={`Select ${influencer.username}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-zinc-800">
                        <AvatarImage
                          src={influencer.avatar_url || undefined}
                          alt={influencer.display_name || influencer.username}
                        />
                        <AvatarFallback className="bg-zinc-800 text-zinc-400">
                          {(influencer.display_name || influencer.username)
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {influencer.display_name || influencer.username}
                          </p>
                          {/* Verified badge if available */}
                        </div>
                        <p className="text-xs text-zinc-500 truncate">
                          @{influencer.username}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-white">
                      {formatNumber(influencer.follower_count)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {influencer.engagement_rate ? (
                      <span
                        className={cn(
                          "text-sm font-medium",
                          influencer.engagement_rate >= 5
                            ? "text-emerald-400"
                            : influencer.engagement_rate >= 2
                              ? "text-amber-400"
                              : "text-zinc-400"
                        )}
                      >
                        {influencer.engagement_rate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {score > 0 ? (
                      <ScoreBadgeInline score={score} />
                    ) : (
                      <span className="text-sm text-zinc-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {influencer.campaignInfluencer ? (
                      <Badge
                        variant="outline"
                        className="border-violet-500/30 text-violet-400 text-xs"
                      >
                        {influencer.campaignInfluencer.stage.replace(/_/g, " ")}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-zinc-700 text-zinc-500 text-xs"
                      >
                        New
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {onAddToPipeline && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAddToPipeline(influencer)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-violet-400"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                      {onViewProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewProfile(influencer)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      {onAddNotes && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAddNotes(influencer)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-zinc-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="border-zinc-700 text-zinc-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-zinc-400">
              Page {pagination.page} of{" "}
              {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={
                pagination.page >= Math.ceil(pagination.total / pagination.pageSize)
              }
              className="border-zinc-700 text-zinc-400"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function InfluencerTableSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="w-12">
              <Skeleton className="h-4 w-4" />
            </TableHead>
            <TableHead>Influencer</TableHead>
            <TableHead>Followers</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i} className="border-zinc-800">
              <TableCell>
                <Skeleton className="h-4 w-4" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-10 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
