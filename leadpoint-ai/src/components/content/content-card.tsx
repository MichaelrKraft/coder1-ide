'use client'

import { useState } from 'react'
import {
  Play,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  RefreshCw,
  MoreVertical,
  ExternalLink,
  Pencil,
  Trash2,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatNumber, formatEngagement, getStatusColor } from '@/hooks/use-content'
import type { ContentPost } from '@/types/content'

// ============================================================================
// Types
// ============================================================================

interface ContentCardProps {
  post: ContentPost
  onRefresh?: (id: string) => void
  onEdit?: (post: ContentPost) => void
  onDelete?: (id: string) => void
  isRefreshing?: boolean
}

// ============================================================================
// Platform Icon Component
// ============================================================================

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    tiktok: 'bg-black text-white',
    instagram: 'bg-gradient-to-br from-purple-600 to-pink-500 text-white',
    youtube: 'bg-red-600 text-white',
  }

  return (
    <span
      className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded-full ${
        colors[platform] || 'bg-zinc-700 text-zinc-300'
      }`}
    >
      {platform.charAt(0).toUpperCase() + platform.slice(1)}
    </span>
  )
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const { bg, text, dot } = getStatusColor(status)

  return (
    <span
      className={`absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${bg} ${text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ============================================================================
// Metric Item Component
// ============================================================================

function MetricItem({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType
  value: string
  label: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-300 transition-colors">
            <Icon className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">{value}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// Content Card Component
// ============================================================================

export function ContentCard({
  post,
  onRefresh,
  onEdit,
  onDelete,
  isRefreshing = false,
}: ContentCardProps) {
  const [imageError, setImageError] = useState(false)

  const influencer = post.influencer
  const hasMetrics = post.status === 'published' && post.views !== undefined

  return (
    <Card className="overflow-hidden border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors group">
      {/* Thumbnail Section */}
      <div className="relative aspect-[9/16] bg-zinc-800 overflow-hidden">
        {/* Thumbnail Image */}
        {post.thumbnail_url && !imageError ? (
          <img
            src={post.thumbnail_url}
            alt={post.caption || 'Content thumbnail'}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <Play className="h-12 w-12 text-zinc-600" />
          </div>
        )}

        {/* Platform Badge */}
        <PlatformBadge platform={post.platform} />

        {/* Status Badge */}
        <StatusBadge status={post.status} />

        {/* Play Overlay */}
        {post.post_type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={post.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-14 h-14 rounded-full bg-white/90 hover:bg-white transition-colors"
            >
              <Play className="h-6 w-6 text-zinc-900 ml-1" fill="currentColor" />
            </a>
          </div>
        )}

        {/* Scheduled Overlay */}
        {post.status === 'scheduled' && post.expected_publish_date && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                Scheduled for{' '}
                {formatDistanceToNow(new Date(post.expected_publish_date), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Creator Info */}
        {influencer && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={influencer.avatar_url || undefined} />
              <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                {influencer.display_name?.charAt(0) || influencer.username?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {influencer.display_name || influencer.username}
              </p>
              <p className="text-xs text-zinc-500 truncate">@{influencer.username}</p>
            </div>
          </div>
        )}

        {/* Caption Preview */}
        {post.caption && (
          <p className="text-sm text-zinc-400 line-clamp-2">{post.caption}</p>
        )}

        {/* Metrics Row */}
        {hasMetrics && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-4">
              <MetricItem icon={Eye} value={formatNumber(post.views)} label="Views" />
              <MetricItem icon={Heart} value={formatNumber(post.likes)} label="Likes" />
              <MetricItem
                icon={MessageCircle}
                value={formatNumber(post.comments)}
                label="Comments"
              />
            </div>
            {post.engagement_rate !== undefined && (
              <div className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">
                  {formatEngagement(post.engagement_rate)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Additional Metrics (expandable) */}
        {hasMetrics && (post.shares !== undefined || post.saves !== undefined) && (
          <div className="flex items-center gap-4 text-zinc-500 text-xs">
            {post.shares !== undefined && (
              <div className="flex items-center gap-1">
                <Share2 className="h-3 w-3" />
                <span>{formatNumber(post.shares)} shares</span>
              </div>
            )}
            {post.saves !== undefined && (
              <div className="flex items-center gap-1">
                <Bookmark className="h-3 w-3" />
                <span>{formatNumber(post.saves)} saves</span>
              </div>
            )}
          </div>
        )}

        {/* Last Updated */}
        {post.last_scraped_at && (
          <p className="text-xs text-zinc-600">
            Updated {formatDistanceToNow(new Date(post.last_scraped_at), { addSuffix: true })}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {/* View External */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    asChild
                  >
                    <a href={post.post_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View on {post.platform}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Refresh Metrics */}
            {post.status === 'published' && onRefresh && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      onClick={() => onRefresh(post.id)}
                      disabled={isRefreshing}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh metrics</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-zinc-900 border-zinc-800"
            >
              <DropdownMenuItem
                className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                asChild
              >
                <a href={post.post_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on {post.platform}
                </a>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                  onClick={() => onEdit(post)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit details
                </DropdownMenuItem>
              )}
              {post.status === 'published' && onRefresh && (
                <DropdownMenuItem
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                  onClick={() => onRefresh(post.id)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh metrics
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-zinc-800" />
              {onDelete && (
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                  onClick={() => onDelete(post.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export default ContentCard
