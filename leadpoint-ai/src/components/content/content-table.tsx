'use client'

import {
  Eye,
  Heart,
  MessageCircle,
  RefreshCw,
  ExternalLink,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Play,
  Radio,
  Image,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatNumber, formatEngagement, getStatusColor } from '@/hooks/use-content'
import type { ContentPost, ContentFilters } from '@/types/content'

// ============================================================================
// Types
// ============================================================================

interface ContentTableProps {
  posts: ContentPost[]
  onRefresh?: (id: string) => void
  onEdit?: (post: ContentPost) => void
  onDelete?: (id: string) => void
  onSort?: (sort: ContentFilters['sort'], order: ContentFilters['order']) => void
  currentSort?: ContentFilters['sort']
  currentOrder?: ContentFilters['order']
  refreshingIds?: Set<string>
}

type SortField = ContentFilters['sort']

// ============================================================================
// Helper Components
// ============================================================================

function PostTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'video':
      return <Play className="h-4 w-4" />
    case 'live':
      return <Radio className="h-4 w-4" />
    case 'story':
      return <Image className="h-4 w-4" />
    default:
      return <Play className="h-4 w-4" />
  }
}

function StatusBadge({ status }: { status: string }) {
  const { bg, text, dot } = getStatusColor(status)

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${bg} ${text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    tiktok: 'bg-black/50 text-white border-zinc-700',
    instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    youtube: 'bg-red-500/10 text-red-400 border-red-500/30',
  }

  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${
        colors[platform] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
      }`}
    >
      {platform.charAt(0).toUpperCase() + platform.slice(1)}
    </span>
  )
}

function SortableHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
}: {
  label: string
  field: SortField
  currentSort?: SortField
  currentOrder?: 'asc' | 'desc'
  onSort?: (sort: SortField, order: 'asc' | 'desc') => void
}) {
  const isActive = currentSort === field
  const nextOrder = isActive && currentOrder === 'desc' ? 'asc' : 'desc'

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 -ml-3 px-3 text-zinc-400 hover:text-white hover:bg-transparent"
      onClick={() => onSort?.(field, nextOrder)}
    >
      {label}
      {isActive ? (
        currentOrder === 'desc' ? (
          <ArrowDown className="h-3.5 w-3.5 ml-1" />
        ) : (
          <ArrowUp className="h-3.5 w-3.5 ml-1" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />
      )}
    </Button>
  )
}

// ============================================================================
// Content Table Component
// ============================================================================

export function ContentTable({
  posts,
  onRefresh,
  onEdit,
  onDelete,
  onSort,
  currentSort,
  currentOrder,
  refreshingIds = new Set(),
}: ContentTableProps) {
  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-400 font-medium">Content</TableHead>
            <TableHead className="text-zinc-400 font-medium">Platform</TableHead>
            <TableHead className="text-zinc-400 font-medium">Status</TableHead>
            <TableHead className="text-zinc-400 font-medium">
              <SortableHeader
                label="Views"
                field="views"
                currentSort={currentSort}
                currentOrder={currentOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="text-zinc-400 font-medium">
              <SortableHeader
                label="Likes"
                field="likes"
                currentSort={currentSort}
                currentOrder={currentOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="text-zinc-400 font-medium">Comments</TableHead>
            <TableHead className="text-zinc-400 font-medium">
              <SortableHeader
                label="Engagement"
                field="engagement_rate"
                currentSort={currentSort}
                currentOrder={currentOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="text-zinc-400 font-medium">
              <SortableHeader
                label="Published"
                field="actual_publish_date"
                currentSort={currentSort}
                currentOrder={currentOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="text-zinc-400 font-medium text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => {
            const influencer = post.influencer
            const isRefreshing = refreshingIds.has(post.id)

            return (
              <TableRow
                key={post.id}
                className="border-zinc-800 hover:bg-zinc-800/50 transition-colors"
              >
                {/* Content Info */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                      {post.thumbnail_url ? (
                        <img
                          src={post.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PostTypeIcon type={post.post_type} />
                        </div>
                      )}
                    </div>
                    {/* Creator Info */}
                    <div className="min-w-0">
                      {influencer ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={influencer.avatar_url || undefined} />
                              <AvatarFallback className="bg-zinc-700 text-xs">
                                {influencer.display_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-white truncate">
                              {influencer.display_name || influencer.username}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            @{influencer.username}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm text-zinc-400">Unknown creator</span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Platform */}
                <TableCell>
                  <PlatformBadge platform={post.platform} />
                </TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge status={post.status} />
                </TableCell>

                {/* Views */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Eye className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="font-medium">{formatNumber(post.views)}</span>
                  </div>
                </TableCell>

                {/* Likes */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Heart className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="font-medium">{formatNumber(post.likes)}</span>
                  </div>
                </TableCell>

                {/* Comments */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <MessageCircle className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="font-medium">{formatNumber(post.comments)}</span>
                  </div>
                </TableCell>

                {/* Engagement Rate */}
                <TableCell>
                  {post.engagement_rate !== undefined ? (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        {formatEngagement(post.engagement_rate)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-zinc-500">-</span>
                  )}
                </TableCell>

                {/* Published Date */}
                <TableCell>
                  {post.actual_publish_date ? (
                    <span className="text-sm text-zinc-400">
                      {formatDistanceToNow(new Date(post.actual_publish_date), {
                        addSuffix: true,
                      })}
                    </span>
                  ) : post.expected_publish_date ? (
                    <span className="text-sm text-amber-400">
                      Scheduled{' '}
                      {formatDistanceToNow(new Date(post.expected_publish_date), {
                        addSuffix: true,
                      })}
                    </span>
                  ) : (
                    <span className="text-zinc-500">-</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {/* View External */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
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
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
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

                    {/* Edit */}
                    {onEdit && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                              onClick={() => onEdit(post)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Delete */}
                    {onDelete && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => onDelete(post.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default ContentTable
