'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Plus,
  LayoutGrid,
  List,
  Filter,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  Video,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ContentCard } from '@/components/content/content-card'
import { ContentTable } from '@/components/content/content-table'
import { AddContentForm } from '@/components/content/add-content-form'
import { MetricsChart } from '@/components/content/metrics-chart'
import {
  useContent,
  useRefreshMetrics,
  useDeleteContent,
  formatNumber,
  formatEngagement,
} from '@/hooks/use-content'
import { useToast } from '@/hooks/use-toast'
import type { ContentPost, ContentFilters, ContentStatus, MetricsSnapshot } from '@/types/content'

// ============================================================================
// Types
// ============================================================================

// Params now accessed via useParams() hook

type ViewMode = 'grid' | 'list'
type StatusFilter = ContentStatus | 'all'
type SortOption = ContentFilters['sort']

// ============================================================================
// Stats Card Component
// ============================================================================

function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'violet',
}: {
  label: string
  value: string | number
  icon: typeof Eye
  trend?: string
  color?: 'violet' | 'emerald' | 'amber' | 'blue'
}) {
  const colorClasses = {
    violet: 'bg-violet-500/10 text-violet-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-zinc-400">{label}</p>
            <p className="text-2xl font-semibold text-white">{value}</p>
            {trend && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ onAddContent }: { onAddContent: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 mb-6">
        <Video className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No content yet</h3>
      <p className="text-zinc-400 max-w-md mb-6">
        Start tracking influencer content by adding post URLs. Metrics will be
        automatically fetched and updated.
      </p>
      <Button
        onClick={onAddContent}
        className="bg-violet-600 hover:bg-violet-700 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add First Content
      </Button>
    </div>
  )
}

// ============================================================================
// Delete Confirmation Dialog
// ============================================================================

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Delete Content</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Are you sure you want to delete this content? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-3 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function CampaignContentPage() {
  const params = useParams()
  const campaignId = params.id as string

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('created_at')
  const [sortOrder, setSortOrder] = useState<ContentFilters['order']>('desc')
  const [showAddForm, setShowAddForm] = useState(false)
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedPost, setSelectedPost] = useState<ContentPost | null>(null)

  const { toast } = useToast()

  // Data fetching
  const filters: Omit<ContentFilters, 'campaign_id'> = {
    status: statusFilter === 'all' ? undefined : statusFilter,
    sort: sortBy,
    order: sortOrder,
  }

  const { data, isLoading, error, refetch } = useContent(campaignId, filters)

  // Mutations
  const refreshMetrics = useRefreshMetrics()
  const deleteContent = useDeleteContent()

  // Extract data
  const posts = data?.data || []
  const stats = data?.stats

  // Aggregate all metrics history for chart
  const allMetricsHistory: MetricsSnapshot[] = posts
    .filter((p) => p.metrics_history && p.metrics_history.length > 0)
    .flatMap((p) => p.metrics_history || [])
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Handlers
  const handleRefresh = useCallback(
    async (id: string) => {
      setRefreshingIds((prev) => new Set(prev).add(id))

      try {
        await refreshMetrics.mutateAsync(id)
        toast({
          title: 'Metrics refreshed',
          description: 'Content metrics have been updated.',
        })
      } catch (err) {
        toast({
          title: 'Refresh failed',
          description: err instanceof Error ? err.message : 'Failed to refresh metrics',
          variant: 'destructive',
        })
      } finally {
        setRefreshingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [refreshMetrics, toast]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return

    try {
      await deleteContent.mutateAsync(deleteTarget)
      toast({
        title: 'Content deleted',
        description: 'The content has been removed.',
      })
      setDeleteTarget(null)
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to delete content',
        variant: 'destructive',
      })
    }
  }, [deleteTarget, deleteContent, toast])

  const handleSort = useCallback(
    (sort: SortOption, order: ContentFilters['order']) => {
      setSortBy(sort)
      setSortOrder(order)
    },
    []
  )

  const handleEdit = useCallback((post: ContentPost) => {
    setSelectedPost(post)
    // TODO: Open edit dialog
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
          <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-80 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 mb-6">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Failed to load content
        </h3>
        <p className="text-zinc-400 mb-6">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <Button
          onClick={() => refetch()}
          className="bg-violet-600 hover:bg-violet-700 text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Content</h2>
          <p className="text-zinc-400 mt-1">
            Track and manage influencer content posts
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Content
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label="Total Views"
            value={formatNumber(stats.total_views)}
            icon={Eye}
            color="violet"
          />
          <StatsCard
            label="Total Likes"
            value={formatNumber(stats.total_likes)}
            icon={Heart}
            color="emerald"
          />
          <StatsCard
            label="Total Comments"
            value={formatNumber(stats.total_comments)}
            icon={MessageCircle}
            color="blue"
          />
          <StatsCard
            label="Avg Engagement"
            value={formatEngagement(stats.avg_engagement_rate)}
            icon={TrendingUp}
            color="amber"
          />
        </div>
      )}

      {/* Metrics Chart */}
      {allMetricsHistory.length > 0 && (
        <MetricsChart history={allMetricsHistory} title="Campaign Performance" />
      )}

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-36 bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-zinc-300 focus:text-white focus:bg-zinc-700">
                  All Status
                </SelectItem>
                <SelectItem value="published" className="text-zinc-300 focus:text-white focus:bg-zinc-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    Published
                  </div>
                </SelectItem>
                <SelectItem value="scheduled" className="text-zinc-300 focus:text-white focus:bg-zinc-700">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    Scheduled
                  </div>
                </SelectItem>
                <SelectItem value="removed" className="text-zinc-300 focus:text-white focus:bg-zinc-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                    Removed
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
          >
            <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="created_at" className="text-zinc-300 focus:text-white focus:bg-zinc-700">
                Date Added
              </SelectItem>
              <SelectItem value="views" className="text-zinc-300 focus:text-white focus:bg-zinc-700">
                Views
              </SelectItem>
              <SelectItem value="likes" className="text-zinc-300 focus:text-white focus:bg-zinc-700">
                Likes
              </SelectItem>
              <SelectItem value="engagement_rate" className="text-zinc-300 focus:text-white focus:bg-zinc-700">
                Engagement
              </SelectItem>
              <SelectItem value="actual_publish_date" className="text-zinc-300 focus:text-white focus:bg-zinc-700">
                Publish Date
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-800 border border-zinc-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={`h-8 px-3 ${
              viewMode === 'grid'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-transparent'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('list')}
            className={`h-8 px-3 ${
              viewMode === 'list'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-transparent'
            }`}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      {stats && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">
            {stats.total_posts} total posts
          </span>
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" />
            {stats.published_count} published
          </span>
          <span className="text-amber-400 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {stats.scheduled_count} scheduled
          </span>
        </div>
      )}

      {/* Content Display */}
      {posts.length === 0 ? (
        <EmptyState onAddContent={() => setShowAddForm(true)} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {posts.map((post) => (
            <ContentCard
              key={post.id}
              post={post}
              onRefresh={handleRefresh}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteTarget(id)}
              isRefreshing={refreshingIds.has(post.id)}
            />
          ))}
        </div>
      ) : (
        <ContentTable
          posts={posts}
          onRefresh={handleRefresh}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteTarget(id)}
          onSort={handleSort}
          currentSort={sortBy}
          currentOrder={sortOrder}
          refreshingIds={refreshingIds}
        />
      )}

      {/* Add Content Form Dialog */}
      <AddContentForm
        campaignId={campaignId}
        influencerId=""
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={deleteContent.isPending}
      />
    </div>
  )
}
