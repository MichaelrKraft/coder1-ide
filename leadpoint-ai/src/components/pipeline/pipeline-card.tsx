"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScoreBadge } from "@/components/influencers/score-badge"
import type { PipelineInfluencer } from "@/stores/pipeline-store"
import {
  GripVertical,
  MoreHorizontal,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  Trash2,
  Users,
  Clock,
  Send,
  Mail,
  MailOpen,
  Reply,
  CheckCircle,
  Eye,
  MousePointerClick,
  AlertTriangle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface PipelineCardProps {
  item: PipelineInfluencer
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onView?: () => void
  onMessage?: () => void
  onCompose?: () => void // New: explicit compose action
  onMove?: () => void
  onRemove?: () => void
  isDragging?: boolean
  isOverlay?: boolean
  compact?: boolean
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

function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    tiktok: "text-pink-400",
    instagram: "text-fuchsia-400",
    youtube: "text-red-400",
    twitter: "text-sky-400",
    linkedin: "text-blue-400",
  }
  return colors[platform] || "text-zinc-400"
}

function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube",
    twitter: "X/Twitter",
    linkedin: "LinkedIn",
  }
  return labels[platform] || platform
}

// Message status configuration
interface MessageStatusConfig {
  label: string
  icon: React.ReactNode
  borderColor: string
  bgColor: string
  textColor: string
}

function getMessageStatusConfig(status: string): MessageStatusConfig {
  const configs: Record<string, MessageStatusConfig> = {
    draft: {
      label: "Draft",
      icon: <Mail className="h-3 w-3" />,
      borderColor: "border-zinc-500/30",
      bgColor: "bg-zinc-500/10",
      textColor: "text-zinc-400",
    },
    sent: {
      label: "Sent",
      icon: <Send className="h-3 w-3" />,
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-400",
    },
    delivered: {
      label: "Delivered",
      icon: <CheckCircle className="h-3 w-3" />,
      borderColor: "border-green-500/30",
      bgColor: "bg-green-500/10",
      textColor: "text-green-400",
    },
    opened: {
      label: "Opened",
      icon: <MailOpen className="h-3 w-3" />,
      borderColor: "border-emerald-500/30",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-400",
    },
    clicked: {
      label: "Clicked",
      icon: <MousePointerClick className="h-3 w-3" />,
      borderColor: "border-purple-500/30",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-400",
    },
    replied: {
      label: "Replied",
      icon: <Reply className="h-3 w-3" />,
      borderColor: "border-violet-500/30",
      bgColor: "bg-violet-500/10",
      textColor: "text-violet-400",
    },
    bounced: {
      label: "Bounced",
      icon: <AlertTriangle className="h-3 w-3" />,
      borderColor: "border-red-500/30",
      bgColor: "bg-red-500/10",
      textColor: "text-red-400",
    },
  }
  return configs[status] || configs.draft
}

export function PipelineCard({
  item,
  isSelected = false,
  onSelect,
  onView,
  onMessage,
  onCompose,
  onMove,
  onRemove,
  isDragging = false,
  isOverlay = false,
  compact = false,
}: PipelineCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: "pipeline-card",
      item,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragging = isDragging || isSortableDragging
  const score = item.score?.overall ?? 0

  // Use onCompose if provided, otherwise fall back to onMessage
  const handleComposeClick = onCompose || onMessage

  // Determine compose button label based on message status
  const getComposeButtonConfig = () => {
    if (!item.lastMessage) {
      return { label: "Compose", icon: <Send className="h-3 w-3" /> }
    }
    if (item.lastMessage.status === "replied") {
      return { label: "Reply", icon: <Reply className="h-3 w-3" /> }
    }
    if (["sent", "delivered", "opened"].includes(item.lastMessage.status)) {
      return { label: "Follow Up", icon: <MessageSquare className="h-3 w-3" /> }
    }
    return { label: "Compose", icon: <Send className="h-3 w-3" /> }
  }

  const composeConfig = getComposeButtonConfig()

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl border bg-zinc-900/50 p-3 transition-all",
          dragging && "opacity-50 shadow-2xl ring-2 ring-violet-500/50",
          isOverlay && "shadow-2xl ring-2 ring-violet-500",
          isSelected
            ? "border-violet-500 bg-violet-500/5"
            : "border-zinc-800 hover:border-zinc-700"
        )}
      >
        {/* Drag handle */}
        <button
          className="flex-shrink-0 cursor-grab touch-none text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Selection checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="h-4 w-4 flex-shrink-0 rounded border-zinc-700 bg-zinc-900 text-violet-500"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0 border border-zinc-800">
          <AvatarImage src={item.influencer.avatar_url || undefined} />
          <AvatarFallback className="bg-zinc-800 text-xs text-zinc-400">
            {(item.influencer.display_name || item.influencer.username)
              .charAt(0)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {item.influencer.display_name || item.influencer.username}
          </p>
          <p className="truncate text-xs text-zinc-500">
            @{item.influencer.username}
          </p>
        </div>

        {/* Message status indicator */}
        {item.lastMessage && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  {(() => {
                    const config = getMessageStatusConfig(item.lastMessage.status)
                    return (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          config.borderColor,
                          config.bgColor,
                          config.textColor
                        )}
                      >
                        {config.icon}
                      </Badge>
                    )
                  })()}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Last message: {item.lastMessage.status}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Followers */}
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-medium text-white">
            {formatNumber(item.influencer.follower_count)}
          </p>
        </div>

        {/* Score */}
        {score > 0 && (
          <div className="flex-shrink-0">
            <ScoreBadge score={score} size="sm" />
          </div>
        )}

        {/* Compose quick action */}
        {handleComposeClick && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleComposeClick()
                  }}
                >
                  {composeConfig.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{composeConfig.label} Message</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Quick menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onView && (
              <DropdownMenuItem onClick={onView}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
            )}
            {handleComposeClick && (
              <DropdownMenuItem onClick={handleComposeClick}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {composeConfig.label} Message
              </DropdownMenuItem>
            )}
            {onMove && (
              <DropdownMenuItem onClick={onMove}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Move to Stage
              </DropdownMenuItem>
            )}
            {onRemove && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onRemove} className="text-red-400">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Full card view
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-zinc-900/50 p-4 transition-all",
        dragging && "opacity-50 shadow-2xl ring-2 ring-violet-500/50",
        isOverlay && "shadow-2xl ring-2 ring-violet-500",
        isSelected
          ? "border-violet-500 bg-violet-500/5"
          : "border-zinc-800 hover:border-zinc-700"
      )}
    >
      {/* Top row: drag handle, checkbox, quick actions */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            className="cursor-grab touch-none text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Selection checkbox */}
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-500"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Compose quick action button */}
          {handleComposeClick && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 opacity-0 transition-opacity group-hover:opacity-100 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleComposeClick()
                    }}
                  >
                    {composeConfig.icon}
                    <span className="ml-1 text-xs">{composeConfig.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{composeConfig.label} Message</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Quick menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onView && (
                <DropdownMenuItem onClick={onView}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Profile
                </DropdownMenuItem>
              )}
              {handleComposeClick && (
                <DropdownMenuItem onClick={handleComposeClick}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {composeConfig.label} Message
                </DropdownMenuItem>
              )}
              {onMove && (
                <DropdownMenuItem onClick={onMove}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Move to Stage
                </DropdownMenuItem>
              )}
              {onRemove && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onRemove} className="text-red-400">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar className="h-12 w-12 border-2 border-zinc-800">
            <AvatarImage src={item.influencer.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
              {(item.influencer.display_name || item.influencer.username)
                .charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* Platform badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-xs font-medium",
                    getPlatformColor(item.influencer.platform)
                  )}
                >
                  {item.influencer.platform.charAt(0).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {getPlatformLabel(item.influencer.platform)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-white">
              {item.influencer.display_name || item.influencer.username}
            </h4>
            {score > 0 && <ScoreBadge score={score} size="sm" />}
          </div>
          <p className="truncate text-xs text-zinc-500">
            @{item.influencer.username}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-medium text-white">
                  {formatNumber(item.influencer.follower_count)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {item.influencer.follower_count.toLocaleString()} followers
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {item.influencer.engagement_rate && (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs px-1.5 py-0"
          >
            {item.influencer.engagement_rate.toFixed(1)}% ER
          </Badge>
        )}

        {item.contract_value && (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs px-1.5 py-0"
          >
            ${item.contract_value.toLocaleString()}
          </Badge>
        )}
      </div>

      {/* Notes preview */}
      {item.notes && (
        <p className="mt-3 line-clamp-2 text-xs text-zinc-400">{item.notes}</p>
      )}

      {/* Last activity */}
      <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Clock className="h-3 w-3" />
          <span>
            {item.stage_changed_at
              ? formatDistanceToNow(new Date(item.stage_changed_at), {
                  addSuffix: true,
                })
              : "Just added"}
          </span>
        </div>

        {item.lastMessage && (
          <div className="flex items-center gap-2">
            {/* Email channel indicator with tracking stats */}
            {item.lastMessage.channel === "email" && (
              <>
                {/* Opened count */}
                {item.lastMessage.opened_count !== undefined && item.lastMessage.opened_count > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-0.5 text-emerald-400">
                          <Eye className="h-3 w-3" />
                          <span className="text-[10px]">{item.lastMessage.opened_count}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Opened {item.lastMessage.opened_count}x</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Clicked count */}
                {item.lastMessage.clicked_count !== undefined && item.lastMessage.clicked_count > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-0.5 text-purple-400">
                          <MousePointerClick className="h-3 w-3" />
                          <span className="text-[10px]">{item.lastMessage.clicked_count}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Clicked {item.lastMessage.clicked_count}x</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}

            {/* Status badge */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    {(() => {
                      const config = getMessageStatusConfig(item.lastMessage.status)
                      return (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs px-1.5 py-0",
                            config.borderColor,
                            config.bgColor,
                            config.textColor
                          )}
                        >
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      )
                    })()}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {item.lastMessage.channel === "email" ? "Email" : "DM"} {item.lastMessage.status}{" "}
                    {formatDistanceToNow(new Date(item.lastMessage.sentAt), {
                      addSuffix: true,
                    })}
                  </p>
                  {item.lastMessage.bounce_reason && (
                    <p className="text-red-400 mt-1">Reason: {item.lastMessage.bounce_reason}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  )
}

// Overlay version for drag preview
export function PipelineCardOverlay({ item }: { item: PipelineInfluencer }) {
  return <PipelineCard item={item} isOverlay />
}
