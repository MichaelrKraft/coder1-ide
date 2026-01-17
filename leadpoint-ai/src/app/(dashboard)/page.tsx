'use client'

import Link from 'next/link'
import {
  Megaphone,
  Users,
  Mail,
  FileText,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ChangeType = 'positive' | 'negative' | 'neutral'

const stats: Array<{
  name: string
  value: string
  change: string
  changeType: ChangeType
  icon: typeof Megaphone
}> = [
  {
    name: 'Active Campaigns',
    value: '4',
    change: '+1 this week',
    changeType: 'positive',
    icon: Megaphone,
  },
  {
    name: 'Total Influencers',
    value: '127',
    change: '+12 this month',
    changeType: 'positive',
    icon: Users,
  },
  {
    name: 'Pending Outreach',
    value: '23',
    change: '8 awaiting response',
    changeType: 'neutral',
    icon: Mail,
  },
  {
    name: 'Content This Month',
    value: '18',
    change: '+5 from last month',
    changeType: 'positive',
    icon: FileText,
  },
]

const recentActivity = [
  {
    id: 1,
    type: 'response',
    title: 'New response from @fashionista_123',
    description: 'Interested in Summer Collection campaign',
    time: '2 minutes ago',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
  },
  {
    id: 2,
    type: 'milestone',
    title: 'Campaign milestone reached',
    description: '"Summer Sale" campaign reached 50% completion',
    time: '1 hour ago',
    icon: TrendingUp,
    iconColor: 'text-cyan-400',
  },
  {
    id: 3,
    type: 'outreach',
    title: 'Outreach sent to 5 influencers',
    description: 'Automated outreach for "Product Launch" campaign',
    time: '3 hours ago',
    icon: Mail,
    iconColor: 'text-cyan-400',
  },
  {
    id: 4,
    type: 'alert',
    title: 'Contract pending review',
    description: '@lifestyle_guru submitted contract for approval',
    time: '5 hours ago',
    icon: AlertCircle,
    iconColor: 'text-amber-400',
  },
  {
    id: 5,
    type: 'content',
    title: 'New content submitted',
    description: '@tech_reviewer uploaded sponsored post draft',
    time: '1 day ago',
    icon: FileText,
    iconColor: 'text-slate-400',
  },
]

export default function DashboardPage() {
  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  // Smart context messages based on time and activity
  const getContextMessage = () => {
    if (currentHour < 10) return "Let's make today productive! Here's your overview."
    if (currentHour < 14) return "You're doing great! Here's what's happening."
    if (currentHour < 18) return "Keep the momentum going! Check your progress."
    return "Wrapping up? Here's your day in review."
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            {greeting}, John!
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
          </h1>
          <p className="mt-1 text-slate-400">
            {getContextMessage()}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/influencers"
            className="group inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-300 hover:border-cyan-500/30 hover:text-white hover:shadow-[0_0_20px_rgba(0,212,255,0.1)] transition-all duration-300"
          >
            <Search className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            <span className="hidden sm:inline">Discover Influencers</span>
            <span className="sm:hidden">Discover</span>
          </Link>
          <Link
            href="/campaigns/new"
            className={cn(
              "relative overflow-hidden inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
              "bg-gradient-to-b from-violet-400 via-violet-500 to-purple-600",
              "text-white",
              "shadow-lg shadow-violet-500/30",
              "hover:shadow-xl hover:shadow-violet-500/40",
              "hover:from-violet-500 hover:via-violet-600 hover:to-purple-700",
              "hover:-translate-y-0.5",
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
            )}
          >
            <Plus className="h-4 w-4 relative z-10" />
            <span className="hidden sm:inline relative z-10">Create Campaign</span>
            <span className="sm:hidden relative z-10">Create</span>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className={cn(
              "group rounded-xl p-6 transition-all duration-300",
              "bg-slate-900/50 backdrop-blur-sm",
              "border border-cyan-500/20",
              "shadow-[0_0_15px_rgba(0,212,255,0.08)]",
              "hover:border-cyan-500/40",
              "hover:shadow-[0_0_25px_rgba(0,212,255,0.15)]",
              "hover:-translate-y-1"
            )}
          >
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl',
                  'bg-slate-800/80 backdrop-blur-sm',
                  'border border-slate-700/50',
                  'shadow-inner shadow-black/20',
                  'group-hover:border-slate-600/50 group-hover:bg-slate-800',
                  'transition-all duration-300'
                )}
              >
                <stat.icon className="h-5 w-5 text-slate-300 group-hover:text-white transition-colors" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold text-white">{stat.value}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-400">{stat.name}</p>
              <p
                className={cn(
                  'mt-1 text-xs',
                  stat.changeType === 'positive'
                    ? 'text-emerald-400'
                    : stat.changeType === 'negative'
                    ? 'text-red-400'
                    : 'text-slate-500'
                )}
              >
                {stat.change}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
            <h2 className="text-base font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Recent Activity
            </h2>
            <Link
              href="/activity"
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 group"
            >
              View all
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/50">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 px-6 py-4 hover:bg-slate-800/20 transition-colors cursor-pointer"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 bg-slate-800/50"
                >
                  <activity.icon className={cn('h-5 w-5', activity.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {activity.title}
                  </p>
                  <p className="text-sm text-slate-400 truncate">{activity.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                  <Clock className="h-3 w-3" />
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="space-y-6">
          {/* Performance overview */}
          <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              <h2 className="text-base font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Performance
              </h2>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Response Rate</span>
                  <span className="text-sm font-medium text-white">68%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: '68%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Conversion Rate</span>
                  <span className="text-sm font-medium text-white">24%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: '24%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Campaign Completion</span>
                  <span className="text-sm font-medium text-white">82%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: '82%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="rounded-xl border border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm p-6 relative overflow-hidden">
            {/* Animated glow effect */}
            <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                  <div className="absolute inset-0 text-cyan-400 animate-ping opacity-30">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <h2 className="text-base font-semibold text-cyan-400">
                  AI Insights
                </h2>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 p-3 hover:border-cyan-500/30 transition-colors">
                  <p className="text-sm text-slate-300">
                    <span className="text-cyan-400 font-medium">Tip:</span> Your tech
                    niche campaigns have 2.3x higher engagement. Consider expanding
                    there.
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 p-3 hover:border-purple-500/30 transition-colors">
                  <p className="text-sm text-slate-300">
                    <span className="text-emerald-400 font-medium">Opportunity:</span> 12
                    new influencers match your ideal profile this week.
                  </p>
                </div>
              </div>

              <button className="mt-4 w-full rounded-lg border border-cyan-500/30 bg-slate-900/50 px-4 py-2.5 text-sm font-medium text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.15)] transition-all duration-300">
                View All Recommendations
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
