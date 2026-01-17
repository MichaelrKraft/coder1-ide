"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import type { PlanType } from "@/lib/stripe"
import type { SubscriptionResponse } from "@/app/api/billing/subscription/route"

const BILLING_KEY = "billing"
const SUBSCRIPTION_KEY = [BILLING_KEY, "subscription"]

// Types
export interface CheckoutOptions {
  plan: PlanType
}

export interface BillingPortalOptions {
  returnPath?: string
}

// API functions
async function fetchSubscription(): Promise<SubscriptionResponse> {
  const response = await fetch("/api/billing/subscription")

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to fetch subscription")
  }

  return response.json()
}

async function createCheckout(options: CheckoutOptions): Promise<{ url: string }> {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to create checkout session")
  }

  return response.json()
}

async function createBillingPortal(): Promise<{ url: string }> {
  const response = await fetch("/api/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to create billing portal session")
  }

  return response.json()
}

async function cancelSubscription(): Promise<{
  message: string
  cancelAtPeriodEnd: boolean
  periodEnd: string
}> {
  const response = await fetch("/api/billing/subscription", {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to cancel subscription")
  }

  return response.json()
}

async function resumeSubscription(): Promise<{
  message: string
  subscription: unknown
}> {
  const response = await fetch("/api/billing/subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resume" }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to resume subscription")
  }

  return response.json()
}

// Hooks

/**
 * Hook to fetch current subscription status and usage
 */
export function useSubscription() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: fetchSubscription,
    staleTime: 30 * 1000, // Consider stale after 30 seconds
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to create a Stripe checkout session and redirect
 */
export function useCheckout() {
  const router = useRouter()

  return useMutation({
    mutationFn: createCheckout,
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    },
  })
}

/**
 * Hook to create a Stripe billing portal session and redirect
 */
export function useBillingPortal() {
  return useMutation({
    mutationFn: createBillingPortal,
    onSuccess: (data) => {
      // Redirect to Stripe Billing Portal
      if (data.url) {
        window.location.href = data.url
      }
    },
  })
}

/**
 * Hook to cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      // Invalidate subscription query to refetch
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY })
    },
  })
}

/**
 * Hook to resume a canceled subscription
 */
export function useResumeSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: resumeSubscription,
    onSuccess: () => {
      // Invalidate subscription query to refetch
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY })
    },
  })
}

/**
 * Hook to get usage data from subscription
 * Convenience wrapper around useSubscription
 */
export function useUsage() {
  const { data, isLoading, error } = useSubscription()

  return {
    usage: data?.usage ?? null,
    subscription: data?.subscription ?? null,
    isLoading,
    error,
    isMockMode: data?.isMockMode ?? false,
  }
}

/**
 * Combined billing hook for convenience
 * Provides all billing-related state and actions
 */
export function useBilling() {
  const subscription = useSubscription()
  const checkout = useCheckout()
  const billingPortal = useBillingPortal()
  const cancelSub = useCancelSubscription()
  const resumeSub = useResumeSubscription()

  return {
    // Subscription data
    subscription: subscription.data?.subscription ?? null,
    usage: subscription.data?.usage ?? null,
    upcomingInvoice: subscription.data?.upcomingInvoice ?? null,
    isMockMode: subscription.data?.isMockMode ?? false,

    // Loading states
    isLoading: subscription.isLoading,
    isCheckoutLoading: checkout.isPending,
    isPortalLoading: billingPortal.isPending,
    isCanceling: cancelSub.isPending,
    isResuming: resumeSub.isPending,

    // Errors
    error: subscription.error,
    checkoutError: checkout.error,
    portalError: billingPortal.error,
    cancelError: cancelSub.error,
    resumeError: resumeSub.error,

    // Actions
    startCheckout: (plan: PlanType) => checkout.mutate({ plan }),
    openBillingPortal: () => billingPortal.mutate(),
    cancelSubscription: () => cancelSub.mutate(),
    resumeSubscription: () => resumeSub.mutate(),

    // Refetch
    refetch: subscription.refetch,
  }
}
