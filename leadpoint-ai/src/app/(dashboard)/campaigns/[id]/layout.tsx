'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCampaign } from '@/hooks/use-campaigns'
import { Badge } from '@/components/ui/badge'

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

interface CampaignLayoutProps {
  children: React.ReactNode
}

export default function CampaignLayout({
  children,
}: CampaignLayoutProps) {
  // Note: In Next.js 15, params is a Promise
  // We need to use React.use() or handle it differently
  // For now, extract the ID from the pathname
  const pathname = usePathname()
  const id = pathname.split('/')[2] // /campaigns/[id]/...

  const { data, isLoading, error } = useCampaign(id)
  const campaign = data?.data

  const tabs = [
    { name: 'Overview', href: `/campaigns/${id}` },
    { name: 'Discover', href: `/campaigns/${id}/discover` },
    { name: 'Pipeline', href: `/campaigns/${id}/pipeline` },
    { name: 'Series', href: `/campaigns/${id}/series` },
    { name: 'Content', href: `/campaigns/${id}/content` },
    { name: 'Analytics', href: `/campaigns/${id}/analytics` },
  ]

  const isActiveTab = (href: string) => {
    if (href === `/campaigns/${id}`) {
      return pathname === `/campaigns/${id}`
    }
    return pathname.startsWith(href)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-medium text-white mb-2">Campaign not found</h3>
        <p className="text-zinc-400 mb-4">
          The campaign you are looking for does not exist or you do not have access to it.
        </p>
        <Link
          href="/campaigns"
          className="text-violet-400 hover:text-violet-300 transition-colors"
        >
          Go back to campaigns
        </Link>
      </div>
    )
  }

  const status = statusConfig[campaign.status] || statusConfig.draft

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
            <Badge variant="outline" className={cn('border', status.className)}>
              {status.label}
            </Badge>
          </div>
          {campaign.description && (
            <p className="mt-2 text-zinc-400 max-w-2xl">{campaign.description}</p>
          )}
        </div>

        {/* Campaign Info */}
        <div className="flex items-center gap-4 text-sm">
          {campaign.start_date && (
            <div className="text-zinc-400">
              <span className="text-zinc-500">Start:</span>{' '}
              {new Date(campaign.start_date).toLocaleDateString()}
            </div>
          )}
          {campaign.end_date && (
            <div className="text-zinc-400">
              <span className="text-zinc-500">End:</span>{' '}
              {new Date(campaign.end_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActiveTab(tab.href)
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-700'
              )}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Page Content */}
      {children}
    </div>
  )
}
