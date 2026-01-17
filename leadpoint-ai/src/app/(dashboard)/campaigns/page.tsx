'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  LayoutGrid,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CampaignTemplates } from '@/components/campaigns/campaign-templates'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CampaignCard } from '@/components/campaigns/campaign-card'
import { useCampaigns, useUpdateCampaign, useDeleteCampaign } from '@/hooks/use-campaigns'
import { toast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'

type ViewMode = 'grid' | 'table'

const statusConfig = {
  draft: {
    label: 'Draft',
    className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  },
  active: {
    label: 'Active',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  paused: {
    label: 'Paused',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  archived: {
    label: 'Archived',
    className: 'bg-zinc-600/20 text-zinc-500 border-zinc-600/30',
  },
}

export default function CampaignsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [page, setPage] = useState(1)

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, error } = useCampaigns({
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    pageSize: 12,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  const updateCampaign = useUpdateCampaign()
  const deleteCampaign = useDeleteCampaign()

  const handleStatusChange = async (
    id: string,
    status: 'active' | 'paused' | 'archived'
  ) => {
    try {
      await updateCampaign.mutateAsync({ id, data: { status } })
      toast({
        title: 'Status updated',
        description: `Campaign has been ${status === 'active' ? 'activated' : status === 'paused' ? 'paused' : 'archived'}.`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign.mutateAsync(id)
      toast({
        title: 'Campaign archived',
        description: 'The campaign has been archived.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to archive campaign',
        variant: 'destructive',
      })
    }
  }

  const campaigns = data?.data || []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="mt-1 text-zinc-400">
            Manage your influencer marketing campaigns
          </p>
        </div>

        <Link href="/campaigns/new">
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
            <Plus className="mr-2 h-4 w-4 relative z-10" />
            <span className="relative z-10">Create Campaign</span>
          </Button>
        </Link>
      </div>

      {/* Quick Start Templates */}
      <CampaignTemplates />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="pl-9 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:ring-violet-500/20"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-zinc-800/50 border-zinc-700 text-white focus:ring-violet-500/20">
            <Filter className="mr-2 h-4 w-4 text-zinc-500" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem
              value="all"
              className="text-zinc-300 focus:bg-zinc-800 focus:text-white"
            >
              All Status
            </SelectItem>
            <SelectItem
              value="draft"
              className="text-zinc-300 focus:bg-zinc-800 focus:text-white"
            >
              Draft
            </SelectItem>
            <SelectItem
              value="active"
              className="text-zinc-300 focus:bg-zinc-800 focus:text-white"
            >
              Active
            </SelectItem>
            <SelectItem
              value="paused"
              className="text-zinc-300 focus:bg-zinc-800 focus:text-white"
            >
              Paused
            </SelectItem>
            <SelectItem
              value="completed"
              className="text-zinc-300 focus:bg-zinc-800 focus:text-white"
            >
              Completed
            </SelectItem>
            <SelectItem
              value="archived"
              className="text-zinc-300 focus:bg-zinc-800 focus:text-white"
            >
              Archived
            </SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex items-center rounded-lg border border-zinc-700 p-1 bg-zinc-800/50">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'table'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Failed to load campaigns
          </h3>
          <p className="text-zinc-400">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState search={debouncedSearch} statusFilter={statusFilter} />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Name</TableHead>
                <TableHead className="text-zinc-400">Niche</TableHead>
                <TableHead className="text-zinc-400 text-center">
                  Influencers
                </TableHead>
                <TableHead className="text-zinc-400 text-center">
                  Content
                </TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const status =
                  statusConfig[campaign.status] || statusConfig.draft
                const targetNiche =
                  (campaign.target_audience as { interests?: string[] })
                    ?.interests?.[0] || 'General'
                return (
                  <TableRow
                    key={campaign.id}
                    className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/campaigns/${campaign.id}`)
                    }
                  >
                    <TableCell className="font-medium text-white">
                      {campaign.name}
                    </TableCell>
                    <TableCell className="text-zinc-400">{targetNiche}</TableCell>
                    <TableCell className="text-center text-zinc-300">
                      {campaign.stats?.influencerCount || 0}
                    </TableCell>
                    <TableCell className="text-center text-zinc-300">
                      {campaign.stats?.contentCount || 0}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('border', status.className)}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {formatDistanceToNow(new Date(campaign.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-zinc-500">
            Showing {(page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} campaigns
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            >
              Previous
            </Button>
            <span className="text-sm text-zinc-400">
              Page {page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasMore}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({
  search,
  statusFilter,
}: {
  search: string
  statusFilter: string
}) {
  const hasFilters = search || statusFilter !== 'all'

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 mb-6">
        <Megaphone className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">
        {hasFilters ? 'No campaigns found' : 'No campaigns yet'}
      </h3>
      <p className="text-zinc-400 mb-6 max-w-sm">
        {hasFilters
          ? 'Try adjusting your search or filter to find what you are looking for.'
          : 'Create your first campaign to start discovering influencers and managing your marketing efforts.'}
      </p>
      {!hasFilters && (
        <Link href="/campaigns/new">
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
            <Plus className="mr-2 h-4 w-4 relative z-10" />
            <span className="relative z-10">Create Your First Campaign</span>
          </Button>
        </Link>
      )}
    </div>
  )
}
