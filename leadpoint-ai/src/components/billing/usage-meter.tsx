"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface UsageMeterProps {
  label: string
  used: number
  limit: number
  icon?: React.ReactNode
  showPercentage?: boolean
  className?: string
}

export function UsageMeter({
  label,
  used,
  limit,
  icon,
  showPercentage = true,
  className,
}: UsageMeterProps) {
  // Handle unlimited case
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100)
  const remaining = isUnlimited ? Infinity : limit - used

  // Determine color based on usage percentage
  const getColorClass = () => {
    if (isUnlimited) return "bg-gradient-to-r from-violet-500 to-purple-600"
    if (percentage >= 90) return "bg-gradient-to-r from-red-500 to-red-600"
    if (percentage >= 75) return "bg-gradient-to-r from-yellow-500 to-orange-500"
    return "bg-gradient-to-r from-violet-500 to-purple-600"
  }

  const getStatusText = () => {
    if (isUnlimited) return "Unlimited"
    if (percentage >= 100) return "Limit reached"
    if (percentage >= 90) return "Almost at limit"
    if (percentage >= 75) return "High usage"
    return "Good"
  }

  const getStatusColor = () => {
    if (isUnlimited) return "text-violet-500"
    if (percentage >= 90) return "text-red-500"
    if (percentage >= 75) return "text-yellow-500"
    return "text-green-500"
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("text-xs font-medium", getStatusColor())}>
                {getStatusText()}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isUnlimited
                  ? `${used.toLocaleString()} used`
                  : `${remaining.toLocaleString()} remaining this month`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <Progress
          value={isUnlimited ? 30 : percentage}
          className={cn(
            "h-2",
            isUnlimited && "[&>div]:animate-pulse"
          )}
        />
        {/* Custom colored indicator overlay */}
        <div
          className={cn(
            "absolute top-0 left-0 h-2 rounded-full transition-all",
            getColorClass()
          )}
          style={{ width: `${isUnlimited ? 30 : percentage}%` }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {used.toLocaleString()} of {isUnlimited ? "Unlimited" : limit.toLocaleString()} used
        </span>
        {showPercentage && !isUnlimited && (
          <span>{Math.round(percentage)}%</span>
        )}
      </div>
    </div>
  )
}

export interface UsageMetersGridProps {
  usage: {
    lookups: { used: number; limit: number; remaining: number }
    outreach: { used: number; limit: number; remaining: number }
    campaigns?: { used: number; limit: number; remaining: number }
    teamMembers?: { used: number; limit: number; remaining: number }
  }
  className?: string
}

export function UsageMetersGrid({ usage, className }: UsageMetersGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}>
      <UsageMeter
        label="Influencer Lookups"
        used={usage.lookups.used}
        limit={usage.lookups.limit}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        }
      />
      <UsageMeter
        label="Outreach Messages"
        used={usage.outreach.used}
        limit={usage.outreach.limit}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        }
      />
      {usage.campaigns && (
        <UsageMeter
          label="Active Campaigns"
          used={usage.campaigns.used}
          limit={usage.campaigns.limit}
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          }
        />
      )}
      {usage.teamMembers && (
        <UsageMeter
          label="Team Members"
          used={usage.teamMembers.used}
          limit={usage.teamMembers.limit}
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      )}
    </div>
  )
}
