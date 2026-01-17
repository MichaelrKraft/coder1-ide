/**
 * Mock Stripe data for development without API keys
 * This allows the billing UI to function during local development
 */

import type { PlanType } from "./client"
import type { SubscriptionDetails } from "./subscriptions"

// Mock subscription for development
export function getMockSubscription(): SubscriptionDetails {
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

  return {
    id: "sub_mock_development",
    status: "active",
    plan: "growth",
    priceId: "price_mock_growth",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    customerId: "cus_mock_development",
  }
}

// Mock checkout URL that redirects with success params
export function getMockCheckoutUrl(plan: PlanType, successUrl: string): string {
  const url = new URL(successUrl)
  url.searchParams.set("mock", "true")
  url.searchParams.set("success", "true")
  url.searchParams.set("plan", plan)
  url.searchParams.set("session_id", `mock_session_${Date.now()}`)
  return url.toString()
}

// Mock billing portal URL
export function getMockPortalUrl(returnUrl: string): string {
  const url = new URL(returnUrl)
  url.searchParams.set("mock", "true")
  url.searchParams.set("portal", "true")
  return url.toString()
}

// Mock usage data for development
export interface MockUsageData {
  lookups: {
    used: number
    limit: number
    remaining: number
  }
  outreach: {
    used: number
    limit: number
    remaining: number
  }
  campaigns: {
    used: number
    limit: number
    remaining: number
  }
  teamMembers: {
    used: number
    limit: number
    remaining: number
  }
}

export function getMockUsageData(plan: PlanType): MockUsageData {
  const planLimits = {
    starter: { lookups: 500, outreach: 500, campaigns: 3, teamMembers: 1 },
    growth: { lookups: 2500, outreach: 2500, campaigns: 10, teamMembers: 3 },
    scale: { lookups: 10000, outreach: 10000, campaigns: -1, teamMembers: 10 },
  }

  const limits = planLimits[plan]

  // Generate realistic-looking usage (30-70% of limits)
  const usagePercent = 0.3 + Math.random() * 0.4

  const lookupsUsed = Math.floor(limits.lookups * usagePercent)
  const outreachUsed = Math.floor(limits.outreach * usagePercent)
  const campaignsUsed = limits.campaigns === -1 ? 15 : Math.min(Math.floor(limits.campaigns * usagePercent), limits.campaigns)
  const teamMembersUsed = Math.min(Math.floor(limits.teamMembers * 0.7), limits.teamMembers)

  return {
    lookups: {
      used: lookupsUsed,
      limit: limits.lookups,
      remaining: limits.lookups - lookupsUsed,
    },
    outreach: {
      used: outreachUsed,
      limit: limits.outreach,
      remaining: limits.outreach - outreachUsed,
    },
    campaigns: {
      used: campaignsUsed,
      limit: limits.campaigns,
      remaining: limits.campaigns === -1 ? -1 : limits.campaigns - campaignsUsed,
    },
    teamMembers: {
      used: teamMembersUsed,
      limit: limits.teamMembers,
      remaining: limits.teamMembers - teamMembersUsed,
    },
  }
}

// Mock invoice data
export interface MockInvoice {
  id: string
  amount: number
  currency: string
  status: "paid" | "open" | "draft" | "void"
  date: string
  description: string
  pdfUrl?: string
}

export function getMockInvoices(): MockInvoice[] {
  const now = new Date()

  return [
    {
      id: "inv_mock_001",
      amount: 29900,
      currency: "usd",
      status: "paid",
      date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Growth Plan - Monthly",
    },
    {
      id: "inv_mock_002",
      amount: 29900,
      currency: "usd",
      status: "paid",
      date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Growth Plan - Monthly",
    },
    {
      id: "inv_mock_003",
      amount: 9900,
      currency: "usd",
      status: "paid",
      date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      description: "Starter Plan - Monthly",
    },
  ]
}

// Mock payment method
export interface MockPaymentMethod {
  id: string
  type: "card"
  card: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  isDefault: boolean
}

export function getMockPaymentMethods(): MockPaymentMethod[] {
  return [
    {
      id: "pm_mock_001",
      type: "card",
      card: {
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2027,
      },
      isDefault: true,
    },
  ]
}

// Check if we're in mock mode
export function isMockMode(): boolean {
  return !process.env.STRIPE_SECRET_KEY
}

// Console warning for mock mode
export function logMockWarning(operation: string): void {
  console.warn(
    `[Stripe Mock] ${operation} - Running in mock mode. ` +
      "Set STRIPE_SECRET_KEY environment variable for real Stripe integration."
  )
}
