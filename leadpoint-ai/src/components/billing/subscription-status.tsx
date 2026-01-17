"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PLAN_FEATURES, type PlanType } from "@/lib/stripe"

export type SubscriptionStatusType = "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "unpaid"

export interface SubscriptionData {
  id: string
  status: SubscriptionStatusType | string
  plan: PlanType
  planName: string
  price: number
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export interface SubscriptionStatusProps {
  subscription: SubscriptionData | null
  upcomingInvoice?: {
    amount: number
    currency: string
    dueDate: string
  } | null
  isMockMode?: boolean
  isLoading?: boolean
  onManageBilling?: () => void
  onCancelSubscription?: () => void
  onResumeSubscription?: () => void
  className?: string
}

const statusConfig = {
  active: {
    label: "Active",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-green-500",
  },
  trialing: {
    label: "Trial",
    variant: "secondary" as const,
    icon: Clock,
    color: "text-blue-500",
  },
  canceled: {
    label: "Canceled",
    variant: "destructive" as const,
    icon: AlertTriangle,
    color: "text-yellow-500",
  },
  past_due: {
    label: "Past Due",
    variant: "destructive" as const,
    icon: AlertTriangle,
    color: "text-red-500",
  },
  incomplete: {
    label: "Incomplete",
    variant: "outline" as const,
    icon: AlertTriangle,
    color: "text-yellow-500",
  },
  unpaid: {
    label: "Unpaid",
    variant: "destructive" as const,
    icon: AlertTriangle,
    color: "text-red-500",
  },
}

export function SubscriptionStatus({
  subscription,
  upcomingInvoice,
  isMockMode = false,
  isLoading = false,
  onManageBilling,
  onCancelSubscription,
  onResumeSubscription,
  className,
}: SubscriptionStatusProps) {
  if (!subscription) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>
            Choose a plan below to get started with LeadPoint.ai
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Get status config, fallback to active if unknown status
  const statusKey = subscription.status as SubscriptionStatusType
  const status = statusConfig[statusKey] || statusConfig.active
  const StatusIcon = status.icon
  const planFeatures = PLAN_FEATURES[subscription.plan]

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {subscription.planName} Plan
              <Badge variant={status.variant} className="ml-2">
                <StatusIcon className={cn("mr-1 h-3 w-3", status.color)} />
                {status.label}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              ${subscription.price}/month
              {subscription.cancelAtPeriodEnd && (
                <span className="text-yellow-500 ml-2">
                  (Cancels {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")})
                </span>
              )}
            </CardDescription>
          </div>
          {isMockMode && (
            <Badge variant="outline" className="text-xs">
              Demo Mode
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Plan details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Lookups</p>
            <p className="text-sm font-medium">{planFeatures.lookups.toLocaleString()}/mo</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Outreach</p>
            <p className="text-sm font-medium">{planFeatures.outreach.toLocaleString()}/mo</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Campaigns</p>
            <p className="text-sm font-medium">
              {planFeatures.campaigns === -1 ? "Unlimited" : planFeatures.campaigns}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Team Members</p>
            <p className="text-sm font-medium">{planFeatures.team_members}</p>
          </div>
        </div>

        <Separator />

        {/* Billing cycle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Current billing period</span>
          </div>
          <span className="text-sm">
            {format(new Date(subscription.currentPeriodStart), "MMM d")} -{" "}
            {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
          </span>
        </div>

        {/* Upcoming invoice */}
        {upcomingInvoice && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Next payment</span>
            </div>
            <span className="text-sm">
              {formatCurrency(upcomingInvoice.amount, upcomingInvoice.currency)} on{" "}
              {format(new Date(upcomingInvoice.dueDate), "MMM d, yyyy")}
            </span>
          </div>
        )}

        {/* Warning for past due */}
        {subscription.status === "past_due" && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-500">Payment Failed</p>
                <p className="text-sm text-muted-foreground">
                  Your last payment failed. Please update your payment method to continue using all features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation notice */}
        {subscription.cancelAtPeriodEnd && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-500">Subscription Ending</p>
                <p className="text-sm text-muted-foreground">
                  Your subscription will end on{" "}
                  {format(new Date(subscription.currentPeriodEnd), "MMMM d, yyyy")}.
                  You can resume your subscription anytime before then.
                </p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={onManageBilling}
            disabled={isLoading}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Billing
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>

          {subscription.cancelAtPeriodEnd ? (
            <Button
              variant="default"
              onClick={onResumeSubscription}
              disabled={isLoading}
            >
              Resume Subscription
            </Button>
          ) : (
            subscription.status === "active" && (
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={onCancelSubscription}
                disabled={isLoading}
              >
                Cancel Subscription
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
