"use client"

import * as React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScoreBadge } from "./score-badge"
import type { Influencer, CampaignInfluencer } from "@/types/database"
import {
  ExternalLink,
  UserPlus,
  MessageSquare,
  MoreHorizontal,
  BadgeCheck,
  Users,
  TrendingUp,
  Eye,
  Heart,
  Mail,
} from "lucide-react"

interface InfluencerCardProps {
  influencer: Influencer
  campaignInfluencer?: CampaignInfluencer | null
  onAddToPipeline?: (influencer: Influencer) => void
  onViewProfile?: (influencer: Influencer) => void
  onAddNotes?: (influencer: Influencer) => void
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  className?: string
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    tiktok: "/icons/tiktok.svg",
    instagram: "/icons/instagram.svg",
    youtube: "/icons/youtube.svg",
    twitter: "/icons/twitter.svg",
    linkedin: "/icons/linkedin.svg",
  }
  return icons[platform] || ""
}

export function InfluencerCard({
  influencer,
  campaignInfluencer,
  onAddToPipeline,
  onViewProfile,
  onAddNotes,
  isSelected,
  onSelect,
  className,
}: InfluencerCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const score = campaignInfluencer?.score?.overall ?? 0

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-zinc-900/50 p-5 transition-all duration-200",
        isSelected
          ? "border-violet-500 ring-1 ring-violet-500/50"
          : "border-zinc-800 hover:border-zinc-700",
        isHovered && "bg-zinc-900",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div className="absolute top-4 right-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500/50"
          />
        </div>
      )}

      {/* Header: Avatar, Name, Platform */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar className="h-14 w-14 border-2 border-zinc-800">
            <AvatarImage src={influencer.avatar_url || undefined} alt={influencer.display_name} />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
              {influencer.display_name?.charAt(0) || influencer.username.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {influencer.platform && (
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <span className="text-xs">
                {influencer.platform === "tiktok" && "T"}
                {influencer.platform === "instagram" && "I"}
                {influencer.platform === "youtube" && "Y"}
                {influencer.platform === "twitter" && "X"}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white truncate">
              {influencer.display_name || influencer.username}
            </h3>
            {/* Email indicator */}
            {(influencer.email || influencer.contact_info?.email) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Mail className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {influencer.email || influencer.contact_info?.email}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-sm text-zinc-500 truncate">@{influencer.username}</p>
          {influencer.categories && influencer.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {influencer.categories.slice(0, 2).map((category) => (
                <Badge
                  key={category}
                  variant="outline"
                  className="text-xs border-zinc-700 text-zinc-400 px-1.5 py-0"
                >
                  {category}
                </Badge>
              ))}
              {influencer.categories.length > 2 && (
                <Badge
                  variant="outline"
                  className="text-xs border-zinc-700 text-zinc-500 px-1.5 py-0"
                >
                  +{influencer.categories.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Score Badge */}
        {score > 0 && (
          <ScoreBadge
            score={score}
            breakdown={campaignInfluencer?.score}
            size="sm"
          />
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-zinc-800">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <p className="text-lg font-semibold text-white mt-1">
                  {formatNumber(influencer.follower_count)}
                </p>
                <p className="text-xs text-zinc-500">Followers</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{influencer.follower_count.toLocaleString()} followers</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <p className="text-lg font-semibold text-white mt-1">
                  {influencer.engagement_rate
                    ? `${influencer.engagement_rate.toFixed(1)}%`
                    : "N/A"}
                </p>
                <p className="text-xs text-zinc-500">Engagement</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Engagement rate</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400">
                  <Eye className="h-3.5 w-3.5" />
                </div>
                <p className="text-lg font-semibold text-white mt-1">
                  {influencer.average_views
                    ? formatNumber(influencer.average_views)
                    : "N/A"}
                </p>
                <p className="text-xs text-zinc-500">Avg Views</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {influencer.average_views
                  ? `${influencer.average_views.toLocaleString()} average views`
                  : "No view data"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Expanded Details on Hover */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isHovered ? "max-h-32 opacity-100 mt-4" : "max-h-0 opacity-0"
        )}
      >
        {influencer.bio && (
          <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
            {influencer.bio}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {influencer.location && (
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              {influencer.location}
            </span>
          )}
          {influencer.language && (
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              {influencer.language.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className={cn(
          "flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800 transition-all duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        {onAddToPipeline && (
          <Button
            size="sm"
            onClick={() => onAddToPipeline(influencer)}
            className="flex-1 bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Add to Pipeline
          </Button>
        )}
        {onViewProfile && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewProfile(influencer)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
        {onAddNotes && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddNotes(influencer)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Compact version for list views
export function InfluencerCardCompact({
  influencer,
  score,
  onSelect,
  isSelected,
  onClick,
}: {
  influencer: Influencer
  score?: number
  onSelect?: (selected: boolean) => void
  isSelected?: boolean
  onClick?: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer",
        isSelected
          ? "border-violet-500 bg-violet-500/5"
          : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
      )}
      onClick={onClick}
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onSelect(e.target.checked)
          }}
          className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-500"
        />
      )}

      <Avatar className="h-10 w-10 border border-zinc-800">
        <AvatarImage src={influencer.avatar_url || undefined} />
        <AvatarFallback className="bg-zinc-800 text-zinc-400 text-sm">
          {influencer.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {influencer.display_name || influencer.username}
        </p>
        <p className="text-xs text-zinc-500">@{influencer.username}</p>
      </div>

      <div className="text-right">
        <p className="text-sm font-medium text-white">
          {formatNumber(influencer.follower_count)}
        </p>
        <p className="text-xs text-zinc-500">followers</p>
      </div>

      {influencer.engagement_rate && (
        <div className="text-right">
          <p className="text-sm font-medium text-emerald-400">
            {influencer.engagement_rate.toFixed(1)}%
          </p>
          <p className="text-xs text-zinc-500">engagement</p>
        </div>
      )}

      {score !== undefined && score > 0 && (
        <ScoreBadge score={score} size="sm" />
      )}
    </div>
  )
}
