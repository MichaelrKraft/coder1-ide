import Stripe from "stripe"

/**
 * Get the Stripe client instance
 * Returns null if no API key is configured (mock mode)
 */
export function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("[Stripe] No API key found, using mock mode")
    return null
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia",
    typescript: true,
  })
}

// Legacy export for backward compatibility
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    })
  : null

// Price IDs from environment with fallback to mock values
export const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || "price_mock_starter",
  growth: process.env.STRIPE_PRICE_GROWTH || "price_mock_growth",
  scale: process.env.STRIPE_PRICE_SCALE || "price_mock_scale",
} as const

export type PlanType = keyof typeof PRICE_IDS
export type PriceId = (typeof PRICE_IDS)[PlanType]

// Plan features and pricing configuration
export const PLAN_FEATURES = {
  starter: {
    name: "Starter",
    price: 99,
    priceAnnual: 79, // 20% discount
    lookups: 500,
    outreach: 500,
    campaigns: 3,
    team_members: 1,
    features: [
      "Up to 500 influencer lookups/month",
      "500 outreach messages/month",
      "3 active campaigns",
      "Basic analytics",
      "Email support",
      "Standard API access",
    ],
  },
  growth: {
    name: "Growth",
    price: 299,
    priceAnnual: 239, // 20% discount
    lookups: 2500,
    outreach: 2500,
    campaigns: 10,
    team_members: 3,
    features: [
      "Up to 2,500 influencer lookups/month",
      "2,500 outreach messages/month",
      "10 active campaigns",
      "Advanced analytics & AI insights",
      "Priority support",
      "3 team members",
      "Custom templates",
      "Campaign automation",
    ],
    popular: true,
  },
  scale: {
    name: "Scale",
    price: 799,
    priceAnnual: 639, // 20% discount
    lookups: 10000,
    outreach: 10000,
    campaigns: -1, // unlimited
    team_members: 10,
    features: [
      "Up to 10,000 influencer lookups/month",
      "10,000 outreach messages/month",
      "Unlimited campaigns",
      "Custom analytics dashboards",
      "Dedicated account manager",
      "10 team members",
      "API access with higher limits",
      "White-label options",
      "Custom integrations",
    ],
  },
} as const

export type PlanFeatures = (typeof PLAN_FEATURES)[PlanType]

// Helper to get plan from price ID
export function getPlanFromPriceId(priceId: string): PlanType | null {
  for (const [plan, id] of Object.entries(PRICE_IDS)) {
    if (id === priceId) return plan as PlanType
  }
  return null
}

// Helper to check if running in mock mode
export function isStripeMockMode(): boolean {
  return !process.env.STRIPE_SECRET_KEY
}
