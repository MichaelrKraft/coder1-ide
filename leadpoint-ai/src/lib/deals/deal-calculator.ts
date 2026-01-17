/**
 * Deal Structure Calculator
 * "Never pay per video - bundle for efficiency"
 *
 * David Park's methodology:
 * - 3-pack: 20% discount
 * - 5-pack: 35% discount
 * - Always negotiate bundles, not individual videos
 */

import type { DealCalculation, DealTerms } from '@/types/database'

// Bundle discount tiers (David Park formula)
const BUNDLE_DISCOUNTS: { minVideos: number; discount: number }[] = [
  { minVideos: 10, discount: 0.45 },  // 45% off for 10+
  { minVideos: 5, discount: 0.35 },   // 35% off for 5-9
  { minVideos: 3, discount: 0.20 },   // 20% off for 3-4
  { minVideos: 1, discount: 0 },      // No discount for 1-2
]

// Platform multipliers (relative content value)
const PLATFORM_MULTIPLIERS: Record<string, Record<string, number>> = {
  tiktok: {
    reel: 1.0,
    video: 1.0,
    story: 0.3,
    post: 0.5,
    short: 1.0,
  },
  instagram: {
    reel: 1.2,  // Instagram reels often cost more
    story: 0.4,
    post: 0.8,
    video: 1.0,
    short: 1.0,
  },
  youtube: {
    video: 2.5,  // YouTube long-form is premium
    short: 0.8,
    reel: 0.8,
    story: 0.3,
    post: 0.5,
  },
}

// Usage rights premiums
const USAGE_RIGHTS_PREMIUMS: Record<string, number> = {
  organic_only: 0,
  paid_ads: 0.25,      // 25% premium for ad rights
  full_buyout: 0.50,   // 50% premium for full buyout
}

// Market rate benchmarks by follower tier (per TikTok video)
const MARKET_RATES: { maxFollowers: number; minRate: number; maxRate: number }[] = [
  { maxFollowers: 10000, minRate: 50, maxRate: 200 },
  { maxFollowers: 50000, minRate: 200, maxRate: 500 },
  { maxFollowers: 100000, minRate: 500, maxRate: 1000 },
  { maxFollowers: 500000, minRate: 1000, maxRate: 3000 },
  { maxFollowers: 1000000, minRate: 3000, maxRate: 10000 },
  { maxFollowers: Infinity, minRate: 10000, maxRate: 50000 },
]

export interface CalculateDealInput {
  baseRatePerVideo: number
  followerCount: number
  terms: DealTerms
}

/**
 * Calculate the optimal deal structure with discounts
 */
export function calculateDeal(input: CalculateDealInput): DealCalculation {
  const { baseRatePerVideo, followerCount, terms } = input
  const negotiationTips: string[] = []

  // 1. Get bundle discount
  const bundleDiscount = getBundleDiscount(terms.videosCount)
  if (bundleDiscount > 0) {
    negotiationTips.push(`Ask for ${bundleDiscount * 100}% bundle discount for ${terms.videosCount} videos`)
  } else {
    negotiationTips.push('Consider bundling 3+ videos for 20% savings')
  }

  // 2. Get platform multiplier
  const platformMultiplier = PLATFORM_MULTIPLIERS[terms.platform]?.[terms.contentType] || 1.0

  // 3. Calculate usage rights premium
  const usageRightsPremium = USAGE_RIGHTS_PREMIUMS[terms.usageRights] || 0

  // 4. Calculate urgency premium (rush jobs cost more)
  let urgencyPremium = 0
  if (terms.isUrgent || terms.turnaroundDays < 7) {
    urgencyPremium = 0.25 // 25% rush fee
    negotiationTips.push('Rush fee applied - consider extending timeline to save 25%')
  }

  // 5. Calculate exclusivity premium
  let exclusivityPremium = 0
  if (terms.exclusivityDays > 30) {
    exclusivityPremium = 0.15 + (terms.exclusivityDays / 365) * 0.2
    negotiationTips.push(`Long exclusivity (${terms.exclusivityDays} days) adds premium - negotiate shorter period`)
  }

  // Calculate base price per video with platform adjustment
  const adjustedBaseRate = baseRatePerVideo * platformMultiplier

  // Calculate subtotal (before discounts)
  const subtotal = adjustedBaseRate * terms.videosCount

  // Calculate all premiums
  const premiumsTotal = (urgencyPremium + exclusivityPremium + usageRightsPremium) * subtotal

  // Calculate discount amount
  const discountAmount = subtotal * bundleDiscount

  // Final price
  const finalPrice = subtotal + premiumsTotal - discountAmount
  const pricePerVideoEffective = finalPrice / terms.videosCount

  // Calculate savings vs buying individually
  const individualPrice = baseRatePerVideo * terms.videosCount
  const savingsVsIndividual = individualPrice - (subtotal - discountAmount)

  // Get market rate comparison
  const marketRate = getMarketRate(followerCount)
  const comparableMarketRate = marketRate.avg * terms.videosCount

  // Rate the deal
  const dealRating = rateDeal(pricePerVideoEffective, marketRate.avg, bundleDiscount)

  // Add more negotiation tips based on analysis
  if (pricePerVideoEffective > marketRate.max) {
    negotiationTips.push(`Price above market ceiling ($${marketRate.max.toLocaleString()}/video) - negotiate down`)
  } else if (pricePerVideoEffective < marketRate.min) {
    negotiationTips.push(`Great rate below market floor - lock in this deal quickly!`)
  }

  if (terms.usageRights !== 'organic_only') {
    negotiationTips.push('Consider organic-only rights initially, negotiate paid ads separately later')
  }

  if (terms.videosCount === 1 || terms.videosCount === 2) {
    negotiationTips.push('Pro tip: Always bundle 3+ videos - single video deals have no leverage')
  }

  return {
    influencer_id: '', // Set by caller
    base_rate_per_video: baseRatePerVideo,
    videos_count: terms.videosCount,
    bundle_discount_percent: bundleDiscount * 100,
    platform_multiplier: platformMultiplier,
    urgency_premium_percent: urgencyPremium * 100,
    exclusivity_premium_percent: exclusivityPremium * 100,
    usage_rights_premium_percent: usageRightsPremium * 100,
    subtotal,
    total_discount: discountAmount,
    final_price: Math.round(finalPrice),
    price_per_video_effective: Math.round(pricePerVideoEffective),
    negotiation_tips: negotiationTips,
    deal_rating: dealRating,
    comparable_market_rate: Math.round(comparableMarketRate),
    savings_vs_individual: Math.round(savingsVsIndividual > 0 ? savingsVsIndividual : 0),
  }
}

function getBundleDiscount(videoCount: number): number {
  for (const tier of BUNDLE_DISCOUNTS) {
    if (videoCount >= tier.minVideos) {
      return tier.discount
    }
  }
  return 0
}

function getMarketRate(followerCount: number): { min: number; max: number; avg: number } {
  for (const tier of MARKET_RATES) {
    if (followerCount <= tier.maxFollowers) {
      return {
        min: tier.minRate,
        max: tier.maxRate,
        avg: (tier.minRate + tier.maxRate) / 2,
      }
    }
  }
  return { min: 10000, max: 50000, avg: 30000 }
}

function rateDeal(
  effectiveRate: number,
  marketAvg: number,
  bundleDiscount: number
): 'excellent' | 'good' | 'fair' | 'overpriced' {
  const ratio = effectiveRate / marketAvg

  if (ratio <= 0.7 || (ratio <= 0.85 && bundleDiscount >= 0.35)) {
    return 'excellent'
  }
  if (ratio <= 0.9) {
    return 'good'
  }
  if (ratio <= 1.1) {
    return 'fair'
  }
  return 'overpriced'
}

/**
 * Estimate base rate from follower count
 */
export function estimateBaseRate(followerCount: number, platform: string = 'tiktok'): number {
  const market = getMarketRate(followerCount)
  // Apply platform multiplier for estimation
  // YouTube creators typically charge more, Instagram slightly above TikTok
  const platformMultipliers: Record<string, number> = {
    youtube: 1.5,
    instagram: 1.1,
    tiktok: 1.0,
  }
  const multiplier = platformMultipliers[platform] || 1.0
  // Start negotiations at 75% of market average, adjusted for platform
  return Math.round(market.avg * 0.75 * multiplier)
}

/**
 * Generate a proposal summary
 */
export function generateDealSummary(deal: DealCalculation): string {
  const lines = [
    `Deal Summary`,
    ``,
    `Videos: ${deal.videos_count}`,
    `Base Rate: $${deal.base_rate_per_video.toLocaleString()}/video`,
    ``,
    `Adjustments:`,
  ]

  if (deal.bundle_discount_percent > 0) {
    lines.push(`  Bundle Discount: -${deal.bundle_discount_percent}%`)
  }
  if (deal.urgency_premium_percent > 0) {
    lines.push(`  Rush Fee: +${deal.urgency_premium_percent}%`)
  }
  if (deal.exclusivity_premium_percent > 0) {
    lines.push(`  Exclusivity: +${deal.exclusivity_premium_percent.toFixed(1)}%`)
  }
  if (deal.usage_rights_premium_percent > 0) {
    lines.push(`  Usage Rights: +${deal.usage_rights_premium_percent}%`)
  }

  lines.push(``)
  lines.push(`Final Price: $${deal.final_price.toLocaleString()}`)
  lines.push(`Effective Rate: $${deal.price_per_video_effective.toLocaleString()}/video`)

  if (deal.savings_vs_individual > 0) {
    lines.push(`Savings: $${deal.savings_vs_individual.toLocaleString()} vs individual pricing`)
  }

  lines.push(``)
  lines.push(`Rating: ${deal.deal_rating.toUpperCase()}`)

  return lines.join('\n')
}

/**
 * Get comparison with different bundle sizes
 */
export function compareBundleSizes(
  baseRate: number,
  followerCount: number,
  terms: Omit<DealTerms, 'videosCount'>
): { videos: number; deal: DealCalculation }[] {
  const bundles = [1, 3, 5, 10]

  return bundles.map(videos => ({
    videos,
    deal: calculateDeal({
      baseRatePerVideo: baseRate,
      followerCount,
      terms: { ...terms, videosCount: videos },
    }),
  }))
}
