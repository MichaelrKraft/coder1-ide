"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  CreditCard,
  Receipt,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  SubscriptionStatus,
  PricingTable,
  UsageMetersGrid,
} from "@/components/billing"
import { useBilling } from "@/hooks"
import { useToast } from "@/hooks"
import type { PlanType } from "@/lib/stripe"

// Wrap the main content in a separate component for Suspense
function BillingContent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const {
    subscription,
    usage,
    upcomingInvoice,
    isMockMode,
    isLoading,
    isCheckoutLoading,
    isPortalLoading,
    isCanceling,
    isResuming,
    error,
    startCheckout,
    openBillingPortal,
    cancelSubscription,
    resumeSubscription,
    refetch,
  } = useBilling()

  // Track which plan is being loaded for checkout
  const loadingPlan = isCheckoutLoading ? "growth" : null // We'd need to track this better in a real app

  // Handle success/cancel URL params from Stripe redirect
  useEffect(() => {
    const success = searchParams.get("success")
    const canceled = searchParams.get("canceled")
    const mock = searchParams.get("mock")

    if (success === "true") {
      toast({
        title: mock ? "Demo: Subscription Updated" : "Subscription Updated!",
        description: mock
          ? "This is a demo. In production, your plan would be updated."
          : "Your subscription has been successfully updated.",
        variant: "default",
      })
      // Clear URL params
      window.history.replaceState({}, "", "/settings/billing")
      // Refetch subscription data
      refetch()
    } else if (canceled === "true") {
      toast({
        title: "Checkout Canceled",
        description: "You can try again anytime.",
        variant: "default",
      })
      window.history.replaceState({}, "", "/settings/billing")
    }
  }, [searchParams, toast, refetch])

  // Handle plan selection
  const handleSelectPlan = (plan: PlanType, isAnnual: boolean) => {
    startCheckout(plan)
  }

  // Handle cancel subscription with confirmation
  const handleCancelSubscription = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel your subscription? You will retain access until the end of your billing period."
      )
    ) {
      cancelSubscription()
      toast({
        title: "Subscription Canceled",
        description: "Your subscription will end at the end of the billing period.",
      })
    }
  }

  // Handle resume subscription
  const handleResumeSubscription = () => {
    resumeSubscription()
    toast({
      title: "Subscription Resumed",
      description: "Your subscription has been reactivated.",
    })
  }

  // Handle billing portal
  const handleManageBilling = () => {
    openBillingPortal()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Error Loading Billing</CardTitle>
            </div>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load billing information"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="flex items-center justify-center h-10 w-10 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
          <p className="text-zinc-400 mt-1">
            Manage your subscription, usage, and payment methods
          </p>
        </div>
      </div>

      {/* Mock mode banner */}
      {isMockMode && (
        <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-violet-400">Demo Mode Active</p>
              <p className="text-sm text-muted-foreground">
                Stripe is not configured. Billing features are simulated for demonstration.
                Set STRIPE_SECRET_KEY environment variable to enable real billing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Subscription */}
      <SubscriptionStatus
        subscription={subscription}
        upcomingInvoice={upcomingInvoice}
        isMockMode={isMockMode}
        isLoading={isPortalLoading || isCanceling || isResuming}
        onManageBilling={handleManageBilling}
        onCancelSubscription={handleCancelSubscription}
        onResumeSubscription={handleResumeSubscription}
      />

      {/* Usage Section */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Current Usage
            </CardTitle>
            <CardDescription>
              Your usage resets at the start of each billing cycle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageMetersGrid usage={usage} />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Pricing Section */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">
            {subscription ? "Change Your Plan" : "Choose Your Plan"}
          </h2>
          <p className="text-zinc-400 mt-1">
            {subscription
              ? "Upgrade or downgrade your subscription anytime"
              : "Start growing your influencer marketing today"}
          </p>
        </div>

        <PricingTable
          currentPlan={subscription?.plan}
          isLoading={isCheckoutLoading}
          loadingPlan={loadingPlan}
          onSelectPlan={handleSelectPlan}
        />
      </div>

      {/* Payment History Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="h-12 w-12 text-zinc-600 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {subscription
                ? "View your payment history in the billing portal"
                : "No payment history yet. Subscribe to a plan to get started."}
            </p>
            {subscription && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  "View in Billing Portal"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Need Help?</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Have questions about billing or need to make changes to your account?
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <a href="mailto:support@leadpoint.ai">Contact Support</a>
            </Button>
            <Button variant="ghost" asChild>
              <a href="/docs/billing" target="_blank" rel="noopener noreferrer">
                View Docs
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading fallback for Suspense boundary
function BillingLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Loading billing information...</p>
      </div>
    </div>
  )
}

// Export with Suspense boundary for useSearchParams
export default function BillingPage() {
  return (
    <Suspense fallback={<BillingLoading />}>
      <BillingContent />
    </Suspense>
  )
}
