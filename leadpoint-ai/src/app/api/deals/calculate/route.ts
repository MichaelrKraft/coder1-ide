import { NextRequest, NextResponse } from 'next/server'
import { calculateDeal, estimateBaseRate, compareBundleSizes, type CalculateDealInput } from '@/lib/deals/deal-calculator'
import type { DealTerms } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      baseRatePerVideo,
      followerCount,
      videosCount = 3,
      platform = 'tiktok',
      contentType = 'reel',
      exclusivityDays = 30,
      usageRights = 'organic_only',
      isUrgent = false,
      turnaroundDays = 14,
    } = body

    const terms: DealTerms = {
      videosCount,
      platform,
      contentType,
      exclusivityDays,
      usageRights,
      isUrgent,
      turnaroundDays,
    }

    const input: CalculateDealInput = {
      baseRatePerVideo: baseRatePerVideo || estimateBaseRate(followerCount || 50000, platform),
      followerCount: followerCount || 50000,
      terms,
    }

    const deal = calculateDeal(input)

    // Also return bundle comparison
    const bundleComparison = compareBundleSizes(
      input.baseRatePerVideo,
      input.followerCount,
      {
        platform,
        contentType,
        exclusivityDays,
        usageRights,
        isUrgent,
        turnaroundDays,
      }
    )

    return NextResponse.json({
      data: {
        deal,
        bundleComparison,
        estimatedMarketRate: estimateBaseRate(input.followerCount, platform),
      },
      error: null,
    })
  } catch (error) {
    console.error('[Deals] Calculate error:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to calculate deal' },
      { status: 500 }
    )
  }
}

// GET for quick estimate
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const followerCount = Number(searchParams.get('followers')) || 50000
  const platform = searchParams.get('platform') || 'tiktok'

  const baseRate = estimateBaseRate(followerCount, platform)

  return NextResponse.json({
    data: {
      estimatedBaseRate: baseRate,
      followerCount,
      platform,
      bundlePricing: {
        single: baseRate,
        threePack: Math.round(baseRate * 0.8 * 3),
        fivePack: Math.round(baseRate * 0.65 * 5),
        tenPack: Math.round(baseRate * 0.55 * 10),
      },
    },
    error: null,
  })
}
