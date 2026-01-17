"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { ScoreBadge } from "./score-badge"
import type { Influencer, CampaignInfluencer, InfluencerScore } from "@/types/database"
import {
  ExternalLink,
  UserPlus,
  Mail,
  MapPin,
  Globe,
  Users,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Calendar,
  FileText,
  Tag,
  Edit2,
  Trash2,
  Play,
  Image as ImageIcon,
} from "lucide-react"

interface InfluencerDetailPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  influencer: Influencer | null
  campaignInfluencer?: CampaignInfluencer | null
  isLoading?: boolean
  onAddToCampaign?: (influencer: Influencer) => void
  onViewTikTok?: (influencer: Influencer) => void
  onUpdateNotes?: (influencerId: string, notes: string) => void
  recentVideos?: Array<{
    id: string
    thumbnail_url: string
    title?: string
    views?: number
    likes?: number
  }>
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function InfluencerDetailPanel({
  open,
  onOpenChange,
  influencer,
  campaignInfluencer,
  isLoading = false,
  onAddToCampaign,
  onViewTikTok,
  onUpdateNotes,
  recentVideos = [],
}: InfluencerDetailPanelProps) {
  const [notes, setNotes] = React.useState(campaignInfluencer?.notes || "")
  const [isEditingNotes, setIsEditingNotes] = React.useState(false)

  React.useEffect(() => {
    setNotes(campaignInfluencer?.notes || "")
  }, [campaignInfluencer?.notes])

  const handleSaveNotes = () => {
    if (influencer && onUpdateNotes) {
      onUpdateNotes(influencer.id, notes)
    }
    setIsEditingNotes(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 bg-zinc-950 border-zinc-800">
        <ScrollArea className="h-full">
          {isLoading ? (
            <InfluencerDetailSkeleton />
          ) : !influencer ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-500">No influencer selected</p>
            </div>
          ) : (
            <div className="pb-8">
              {/* Header with gradient background */}
              <div className="relative">
                <div className="h-24 bg-gradient-to-br from-violet-500/20 to-purple-600/20" />
                <div className="px-6 -mt-12">
                  <div className="flex items-end gap-4">
                    <Avatar className="h-20 w-20 border-4 border-zinc-950 shadow-xl">
                      <AvatarImage
                        src={influencer.avatar_url || undefined}
                        alt={influencer.display_name || influencer.username}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-2xl">
                        {(influencer.display_name || influencer.username)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {campaignInfluencer?.score && (
                      <div className="mb-2">
                        <ScoreBadge
                          score={campaignInfluencer.score.overall}
                          breakdown={campaignInfluencer.score}
                          size="lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="px-6 mt-4">
                <SheetHeader className="text-left space-y-1">
                  <SheetTitle className="text-xl font-bold text-white">
                    {influencer.display_name || influencer.username}
                  </SheetTitle>
                  <SheetDescription className="text-zinc-400">
                    @{influencer.username}
                  </SheetDescription>
                </SheetHeader>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <div className="text-center">
                    <Users className="h-4 w-4 mx-auto text-zinc-500 mb-1" />
                    <p className="text-lg font-bold text-white">
                      {formatNumber(influencer.follower_count)}
                    </p>
                    <p className="text-xs text-zinc-500">Followers</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="h-4 w-4 mx-auto text-zinc-500 mb-1" />
                    <p className="text-lg font-bold text-emerald-400">
                      {influencer.engagement_rate
                        ? `${influencer.engagement_rate.toFixed(1)}%`
                        : "N/A"}
                    </p>
                    <p className="text-xs text-zinc-500">Engagement</p>
                  </div>
                  <div className="text-center">
                    <Eye className="h-4 w-4 mx-auto text-zinc-500 mb-1" />
                    <p className="text-lg font-bold text-white">
                      {influencer.average_views
                        ? formatNumber(influencer.average_views)
                        : "N/A"}
                    </p>
                    <p className="text-xs text-zinc-500">Avg Views</p>
                  </div>
                </div>

                {/* Bio */}
                {influencer.bio && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Bio</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {influencer.bio}
                    </p>
                  </div>
                )}

                {/* Categories / Niches */}
                {influencer.categories && influencer.categories.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">
                      Categories
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {influencer.categories.map((category) => (
                        <Badge
                          key={category}
                          variant="outline"
                          className="border-violet-500/30 text-violet-400 bg-violet-500/10"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location and Language */}
                <div className="mt-6 space-y-3">
                  {influencer.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-zinc-500" />
                      <span className="text-zinc-400">{influencer.location}</span>
                    </div>
                  )}
                  {influencer.language && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-zinc-500" />
                      <span className="text-zinc-400">
                        {influencer.language.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="my-6 bg-zinc-800" />

                {/* Score Breakdown Chart */}
                {campaignInfluencer?.score && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-zinc-300 mb-4">
                      Score Breakdown
                    </h4>
                    <ScoreBreakdownChart score={campaignInfluencer.score} />
                  </div>
                )}

                {/* Recent Videos */}
                {recentVideos.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">
                      Recent Videos
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {recentVideos.slice(0, 6).map((video) => (
                        <div
                          key={video.id}
                          className="relative aspect-[9/16] rounded-lg overflow-hidden bg-zinc-900 group cursor-pointer"
                        >
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
                              alt={video.title || "Video"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-zinc-700" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="h-8 w-8 text-white" />
                          </div>
                          {video.views && (
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-xs text-white">
                              {formatNumber(video.views)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-zinc-300">Notes</h4>
                    {!isEditingNotes && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingNotes(true)}
                        className="h-7 text-xs text-zinc-400 hover:text-white"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {isEditingNotes ? (
                    <div className="space-y-3">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this influencer..."
                        className="w-full h-24 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          className="bg-violet-500 hover:bg-violet-600"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNotes(campaignInfluencer?.notes || "")
                            setIsEditingNotes(false)
                          }}
                          className="text-zinc-400"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">
                      {notes || "No notes added yet."}
                    </p>
                  )}
                </div>

                {/* Contact Information */}
                {(influencer.email || influencer.contact_info) && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">
                      Contact Information
                    </h4>
                    <div className="space-y-2">
                      {influencer.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-zinc-500" />
                          <a
                            href={`mailto:${influencer.email}`}
                            className="text-violet-400 hover:underline"
                          >
                            {influencer.email}
                          </a>
                        </div>
                      )}
                      {influencer.contact_info?.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4 text-zinc-500" />
                          <a
                            href={influencer.contact_info.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:underline"
                          >
                            {influencer.contact_info.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {influencer.ai_analysis && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">
                      AI Analysis
                    </h4>
                    <div className="space-y-3">
                      {influencer.ai_analysis.content_themes && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">Content Themes</p>
                          <div className="flex flex-wrap gap-1">
                            {influencer.ai_analysis.content_themes.map((theme) => (
                              <Badge
                                key={theme}
                                variant="outline"
                                className="text-xs border-zinc-700 text-zinc-400"
                              >
                                {theme}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {influencer.ai_analysis.growth_trend && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500">Growth Trend</span>
                          <Badge
                            className={cn(
                              influencer.ai_analysis.growth_trend === "growing"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : influencer.ai_analysis.growth_trend === "declining"
                                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                            )}
                          >
                            {influencer.ai_analysis.growth_trend}
                          </Badge>
                        </div>
                      )}
                      {influencer.ai_analysis.posting_frequency && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500">Posting Frequency</span>
                          <span className="text-zinc-300">
                            {influencer.ai_analysis.posting_frequency}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-zinc-600 space-y-1">
                  {influencer.metrics_updated_at && (
                    <p>
                      Metrics updated: {formatDate(influencer.metrics_updated_at)}
                    </p>
                  )}
                  <p>Added: {formatDate(influencer.created_at)}</p>
                </div>

                <Separator className="my-6 bg-zinc-800" />

                {/* Action Buttons */}
                <div className="space-y-3">
                  {onAddToCampaign && !campaignInfluencer && (
                    <Button
                      onClick={() => onAddToCampaign(influencer)}
                      className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add to Campaign
                    </Button>
                  )}
                  {onViewTikTok && (
                    <Button
                      variant="outline"
                      onClick={() => onViewTikTok(influencer)}
                      className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View TikTok Profile
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function ScoreBreakdownChart({ score }: { score: InfluencerScore }) {
  const metrics = [
    { label: "Relevance", value: score.relevance },
    { label: "Engagement", value: score.engagement },
    { label: "Authenticity", value: score.authenticity },
    { label: "Brand Fit", value: score.brand_fit },
    { label: "Value", value: score.value_score },
  ]

  return (
    <div className="space-y-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">{metric.label}</span>
            <span
              className={cn(
                "font-medium",
                metric.value >= 70
                  ? "text-emerald-400"
                  : metric.value >= 50
                    ? "text-amber-400"
                    : "text-red-400"
              )}
            >
              {metric.value}
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                metric.value >= 70
                  ? "bg-emerald-500"
                  : metric.value >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
              )}
              style={{ width: `${metric.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function InfluencerDetailSkeleton() {
  return (
    <div className="pb-8">
      <div className="relative">
        <Skeleton className="h-24 w-full" />
        <div className="px-6 -mt-12">
          <div className="flex items-end gap-4">
            <Skeleton className="h-20 w-20 rounded-full border-4 border-zinc-950" />
            <Skeleton className="h-12 w-12 rounded-full mb-2" />
          </div>
        </div>
      </div>
      <div className="px-6 mt-4 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-4 w-4 mx-auto" />
              <Skeleton className="h-6 w-16 mx-auto" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
