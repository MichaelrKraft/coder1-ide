'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  FileText,
  Mail,
  TrendingUp,
  Target,
  DollarSign,
  ArrowRight,
  Loader2,
  Search,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useCampaign } from '@/hooks/use-campaigns'
import type { PipelineStage } from '@/types/database'

export default function CampaignOverviewPage() {
  const pathname = usePathname()
  const id = pathname.split('/')[2]

  const { data, isLoading, error } = useCampaign(id)
  const campaign = data?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
      </div>
    )
  }

  if (error || !campaign) {
    return null // Layout handles error state
  }

  const stats = campaign.stats

  // Quick stats for the overview
  const quickStats = [
    {
      name: 'Total Influencers',
      value: stats.totalInfluencers.toString(),
      icon: Users,
      color: 'from-blue-500 to-cyan-600',
      description: 'In pipeline',
    },
    {
      name: 'Content Posted',
      value: stats.postsPublished.toString(),
      icon: FileText,
      color: 'from-emerald-500 to-green-600',
      description: 'Published posts',
    },
    {
      name: 'Total Reach',
      value: formatNumber(stats.totalReach),
      icon: TrendingUp,
      color: 'from-violet-500 to-purple-600',
      description: 'Impressions',
    },
    {
      name: 'Response Rate',
      value: `${stats.responseRate.toFixed(0)}%`,
      icon: Mail,
      color: 'from-amber-500 to-orange-600',
      description: `${stats.messagessSent} messages sent`,
    },
  ]

  // Pipeline stage summary
  const stageGroups = [
    {
      name: 'Discovery',
      stages: ['discovered', 'researching'] as PipelineStage[],
      color: 'text-blue-400',
    },
    {
      name: 'Outreach',
      stages: ['outreach_pending', 'contacted'] as PipelineStage[],
      color: 'text-amber-400',
    },
    {
      name: 'Negotiation',
      stages: ['in_negotiation', 'deal_signed'] as PipelineStage[],
      color: 'text-violet-400',
    },
    {
      name: 'Content',
      stages: ['content_in_progress', 'content_posted', 'completed'] as PipelineStage[],
      color: 'text-emerald-400',
    },
  ]

  // Extract campaign details
  const targetAudience = campaign.target_audience as {
    interests?: string[]
    locations?: string[]
    languages?: string[]
  }
  const budgetRange = campaign.budget_range as {
    min?: number
    max?: number
    currency?: string
  }
  const goals = campaign.goals as {
    primary_goal?: string
    kpis?: string[]
  }

  const niche = targetAudience?.interests?.[0] || 'Not specified'
  const hashtags = targetAudience?.interests?.slice(1) || []

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <div
            key={stat.name}
            className={cn(
              "group relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
              "bg-zinc-900/50 backdrop-blur-sm",
              "border border-cyan-500/20",
              "shadow-[0_0_15px_rgba(0,212,255,0.08)]",
              "hover:border-cyan-500/40",
              "hover:shadow-[0_0_25px_rgba(0,212,255,0.15)]"
            )}
          >
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 shadow-inner shadow-black/20 group-hover:border-slate-600/50 transition-all duration-300">
                  <stat.icon className="h-6 w-6 text-slate-300 group-hover:text-white transition-colors" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-zinc-400">{stat.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{stat.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline Overview */}
        <div className={cn(
          "lg:col-span-2 rounded-2xl overflow-hidden",
          "bg-zinc-900/50 backdrop-blur-sm",
          "border border-cyan-500/20",
          "shadow-[0_0_15px_rgba(0,212,255,0.08)]"
        )}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/10">
            <h2 className="text-lg font-semibold text-white">Pipeline Overview</h2>
            <Link
              href={`/campaigns/${id}/pipeline`}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-1"
            >
              View Pipeline
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {stageGroups.map((group) => {
                const count = group.stages.reduce(
                  (sum, stage) => sum + (stats.byStage[stage] || 0),
                  0
                )
                return (
                  <div
                    key={group.name}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl",
                      "bg-zinc-800/50 backdrop-blur-sm",
                      "border border-cyan-500/20",
                      "shadow-[0_0_10px_rgba(0,212,255,0.05)]",
                      "hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(0,212,255,0.1)]",
                      "transition-all duration-300"
                    )}
                  >
                    <div>
                      <p className={cn('text-sm font-medium', group.color)}>
                        {group.name}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {group.stages.length} stages
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                  </div>
                )
              })}
            </div>

            {stats.totalInfluencers === 0 && (
              <div className="mt-6 text-center py-8">
                <Search className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 mb-4">
                  No influencers in your pipeline yet
                </p>
                <Link href={`/campaigns/${id}/discover`}>
                  <Button className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700">
                    <Search className="mr-2 h-4 w-4" />
                    Discover Influencers
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Campaign Details */}
        <div className="space-y-6">
          {/* Target Audience */}
          <div className={cn(
            "rounded-2xl p-6",
            "bg-zinc-900/50 backdrop-blur-sm",
            "border border-cyan-500/20",
            "shadow-[0_0_15px_rgba(0,212,255,0.08)]"
          )}>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Target Audience</h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                  Niche
                </p>
                <p className="text-sm text-zinc-300">{niche}</p>
              </div>

              {hashtags.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                    Hashtags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs"
                      >
                        <Hash className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {targetAudience?.locations && targetAudience.locations.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Locations
                  </p>
                  <p className="text-sm text-zinc-300">
                    {targetAudience.locations.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Budget & Timeline */}
          <div className={cn(
            "rounded-2xl p-6",
            "bg-zinc-900/50 backdrop-blur-sm",
            "border border-cyan-500/20",
            "shadow-[0_0_15px_rgba(0,212,255,0.08)]"
          )}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Budget & Timeline</h2>
            </div>

            <div className="space-y-4">
              {budgetRange?.max ? (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Budget
                  </p>
                  <p className="text-sm text-zinc-300">
                    ${budgetRange.max.toLocaleString()} {budgetRange.currency || 'USD'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Spent: ${stats.totalSpend.toLocaleString()}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Budget
                  </p>
                  <p className="text-sm text-zinc-400">Not specified</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Start Date
                  </p>
                  <p className="text-sm text-zinc-300">
                    {campaign.start_date
                      ? new Date(campaign.start_date).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    End Date
                  </p>
                  <p className="text-sm text-zinc-300">
                    {campaign.end_date
                      ? new Date(campaign.end_date).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Goals */}
          {goals?.primary_goal && (
            <div className={cn(
              "rounded-2xl p-6",
              "bg-zinc-900/50 backdrop-blur-sm",
              "border border-cyan-500/20",
              "shadow-[0_0_15px_rgba(0,212,255,0.08)]"
            )}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Goals</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Primary Goal
                  </p>
                  <p className="text-sm text-zinc-300 capitalize">
                    {goals.primary_goal.replace(/_/g, ' ')}
                  </p>
                </div>

                {goals.kpis && goals.kpis.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                      KPIs
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {goals.kpis.map((kpi) => (
                        <span
                          key={kpi}
                          className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs capitalize"
                        >
                          {kpi}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className={cn(
            "rounded-2xl p-6",
            "bg-zinc-900/50 backdrop-blur-sm",
            "border border-cyan-500/20",
            "shadow-[0_0_15px_rgba(0,212,255,0.08)]"
          )}>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/campaigns/${id}/discover`}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-cyan-500/20 hover:border-cyan-500/30 hover:shadow-[0_0_10px_rgba(0,212,255,0.08)] transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-violet-400" />
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    Discover Influencers
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
              </Link>
              <Link
                href={`/campaigns/${id}/pipeline`}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-cyan-500/20 hover:border-cyan-500/30 hover:shadow-[0_0_10px_rgba(0,212,255,0.08)] transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    Manage Pipeline
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
              </Link>
              <Link
                href={`/campaigns/${id}/content`}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-cyan-500/20 hover:border-cyan-500/30 hover:shadow-[0_0_10px_rgba(0,212,255,0.08)] transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    View Content
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}
