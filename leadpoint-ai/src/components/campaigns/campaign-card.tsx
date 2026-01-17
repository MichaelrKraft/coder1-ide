'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Megaphone,
  Users,
  FileText,
  Calendar,
  MoreVertical,
  Play,
  Pause,
  Archive,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CampaignWithStats } from '@/hooks/use-campaigns'

interface CampaignCardProps {
  campaign: CampaignWithStats
  onStatusChange?: (id: string, status: 'active' | 'paused' | 'archived') => void
  onDelete?: (id: string) => void
}

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

export function CampaignCard({
  campaign,
  onStatusChange,
  onDelete,
}: CampaignCardProps) {
  const status = statusConfig[campaign.status] || statusConfig.draft
  const createdAt = new Date(campaign.created_at)
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true })

  // Extract niche from target_audience
  const targetNiche =
    (campaign.target_audience as { interests?: string[] })?.interests?.[0] || 'General'

  return (
    <Link href={`/campaigns/${campaign.id}`} className="block group">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-lg hover:shadow-violet-500/5">
        {/* Background gradient on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br from-violet-500 to-purple-600" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <Megaphone className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-violet-400 transition-colors">
                  {campaign.name}
                </h3>
                <p className="text-sm text-zinc-500">{targetNiche}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn('border', status.className)}
              >
                {status.label}
              </Badge>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-zinc-900 border-zinc-800"
                >
                  <DropdownMenuItem
                    className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                    onClick={(e) => {
                      e.preventDefault()
                      // Navigate handled by Link
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Campaign
                  </DropdownMenuItem>

                  {campaign.status !== 'active' && campaign.status !== 'archived' && (
                    <DropdownMenuItem
                      className="text-emerald-400 focus:text-emerald-300 focus:bg-zinc-800"
                      onClick={(e) => {
                        e.preventDefault()
                        onStatusChange?.(campaign.id, 'active')
                      }}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Activate
                    </DropdownMenuItem>
                  )}

                  {campaign.status === 'active' && (
                    <DropdownMenuItem
                      className="text-amber-400 focus:text-amber-300 focus:bg-zinc-800"
                      onClick={(e) => {
                        e.preventDefault()
                        onStatusChange?.(campaign.id, 'paused')
                      }}
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator className="bg-zinc-800" />

                  <DropdownMenuItem
                    className="text-red-400 focus:text-red-300 focus:bg-zinc-800"
                    onClick={(e) => {
                      e.preventDefault()
                      onDelete?.(campaign.id)
                    }}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Description */}
          {campaign.description && (
            <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
              {campaign.description}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
                <Users className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {campaign.stats?.influencerCount || 0}
                </p>
                <p className="text-xs text-zinc-500">Influencers</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
                <FileText className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {campaign.stats?.contentCount || 0}
                </p>
                <p className="text-xs text-zinc-500">Content</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
                <Calendar className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white truncate">
                  {campaign.start_date
                    ? new Date(campaign.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '-'}
                </p>
                <p className="text-xs text-zinc-500">Start</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
            <p className="text-xs text-zinc-500">Created {timeAgo}</p>

            {campaign.budget_range && (
              <p className="text-xs text-zinc-400">
                Budget: ${(campaign.budget_range as { max?: number }).max?.toLocaleString() || '0'}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
