'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Inbox,
  Search,
  AlertCircle,
  Clock,
  Users,
  Megaphone,
  BarChart3,
  FileText,
  type LucideIcon,
} from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="rounded-full bg-zinc-800/50 p-4 mb-4">
        <Icon className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-sm mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              className={cn(
                action.variant !== 'outline' && action.variant !== 'secondary' &&
                'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700'
              )}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Preset empty states for common scenarios

function NoDataEmptyState({
  title = 'No data yet',
  description = 'There is no data to display at the moment.',
  action,
}: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      icon={Inbox}
      title={title}
      description={description}
      action={action}
    />
  )
}

function NoResultsEmptyState({
  title = 'No results found',
  description = 'Try adjusting your search or filter criteria.',
  action,
}: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      icon={Search}
      title={title}
      description={description}
      action={action}
    />
  )
}

function ErrorEmptyState({
  title = 'Something went wrong',
  description = 'We encountered an error loading this content. Please try again.',
  action,
}: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={action || { label: 'Try again', onClick: () => window.location.reload() }}
    />
  )
}

function ComingSoonEmptyState({
  title = 'Coming soon',
  description = 'This feature is currently in development and will be available soon.',
}: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      icon={Clock}
      title={title}
      description={description}
    />
  )
}

// Domain-specific empty states

function NoCampaignsEmptyState({
  onCreateCampaign,
}: {
  onCreateCampaign?: () => void
}) {
  return (
    <EmptyState
      icon={Megaphone}
      title="Create your first campaign"
      description="Start by creating a campaign to organize your influencer marketing efforts and track performance."
      action={
        onCreateCampaign
          ? { label: 'Create Campaign', onClick: onCreateCampaign }
          : undefined
      }
    />
  )
}

function NoInfluencersEmptyState({
  onDiscover,
}: {
  onDiscover?: () => void
}) {
  return (
    <EmptyState
      icon={Users}
      title="Discover influencers"
      description="Use AI-powered discovery to find the perfect influencers for your brand. Filter by niche, engagement, and more."
      action={
        onDiscover
          ? { label: 'Start Discovery', onClick: onDiscover }
          : undefined
      }
    />
  )
}

function NoPipelineInfluencersEmptyState({
  onAddInfluencer,
}: {
  onAddInfluencer?: () => void
}) {
  return (
    <EmptyState
      icon={Users}
      title="Add influencers to your pipeline"
      description="Start tracking your outreach by adding influencers to your pipeline. Drag and drop them through stages as you progress."
      action={
        onAddInfluencer
          ? { label: 'Add Influencer', onClick: onAddInfluencer }
          : undefined
      }
    />
  )
}

function NoContentEmptyState({
  onTrackContent,
}: {
  onTrackContent?: () => void
}) {
  return (
    <EmptyState
      icon={FileText}
      title="Track your first content"
      description="Start monitoring content performance by adding posts from your influencer collaborations."
      action={
        onTrackContent
          ? { label: 'Track Content', onClick: onTrackContent }
          : undefined
      }
    />
  )
}

function NoAnalyticsEmptyState({
  onStartCampaign,
}: {
  onStartCampaign?: () => void
}) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No analytics data yet"
      description="Analytics will appear here once you start running campaigns and tracking influencer content."
      action={
        onStartCampaign
          ? { label: 'Start a Campaign', onClick: onStartCampaign }
          : undefined
      }
    />
  )
}

export {
  EmptyState,
  NoDataEmptyState,
  NoResultsEmptyState,
  ErrorEmptyState,
  ComingSoonEmptyState,
  NoCampaignsEmptyState,
  NoInfluencersEmptyState,
  NoPipelineInfluencersEmptyState,
  NoContentEmptyState,
  NoAnalyticsEmptyState,
}
