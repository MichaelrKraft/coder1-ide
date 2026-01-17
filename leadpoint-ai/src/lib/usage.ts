/**
 * Usage tracking utilities for LeadPoint.ai
 * Manages organization usage quotas and deductions
 */

import { createClient } from '@/lib/supabase/server'
import type { SubscriptionPlan } from '@/types/database'
import type { UsageQuota } from '@/types/discovery'

// ============================================================================
// Usage Limits by Plan
// ============================================================================

const LOOKUP_LIMITS: Record<SubscriptionPlan, number> = {
  free: 50,
  starter: 500,
  growth: 2500,
  scale: 10000,
}

const OUTREACH_LIMITS: Record<SubscriptionPlan, number> = {
  free: 25,
  starter: 500,
  growth: 2500,
  scale: 10000,
}

// ============================================================================
// Get Usage Limits
// ============================================================================

export function getUsageLimits(plan: SubscriptionPlan): { lookups: number; outreach: number } {
  return {
    lookups: LOOKUP_LIMITS[plan],
    outreach: OUTREACH_LIMITS[plan],
  }
}

export function getLookupLimit(plan: SubscriptionPlan): number {
  return LOOKUP_LIMITS[plan]
}

export function getOutreachLimit(plan: SubscriptionPlan): number {
  return OUTREACH_LIMITS[plan]
}

// ============================================================================
// Check Usage Quota
// ============================================================================

export async function checkUsageQuota(organizationId: string): Promise<UsageQuota> {
  const supabase = await createClient()

  // Get organization with subscription info
  const { data: org, error } = await supabase
    .from('organizations')
    .select('subscription_plan, monthly_discovery_credits, credits_reset_at')
    .eq('id', organizationId)
    .single()

  if (error || !org) {
    throw new Error(`Failed to fetch organization: ${error?.message || 'Not found'}`)
  }

  const plan = org.subscription_plan as SubscriptionPlan
  const limit = getLookupLimit(plan)
  const used = org.monthly_discovery_credits || 0
  const creditsResetAt = org.credits_reset_at ? new Date(org.credits_reset_at) : new Date()

  // Calculate period start and end
  const periodStart = getMonthStart(creditsResetAt)
  const periodEnd = getMonthEnd(creditsResetAt)

  return {
    lookups_used: used,
    lookups_limit: limit,
    lookups_remaining: Math.max(0, limit - used),
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    plan,
  }
}

// ============================================================================
// Deduct Usage
// ============================================================================

export async function deductUsage(
  organizationId: string,
  amount: number,
  reason: string = 'discovery'
): Promise<void> {
  const supabase = await createClient()

  // First check if credits need to be reset (new month)
  await resetCreditsIfNeeded(organizationId)

  // Increment the usage counter
  const { error } = await supabase.rpc('increment_discovery_credits', {
    org_id: organizationId,
    credit_amount: amount,
  })

  if (error) {
    // Fallback: direct update if RPC doesn't exist
    console.warn('RPC not available, using direct update:', error.message)

    const { data: org } = await supabase
      .from('organizations')
      .select('monthly_discovery_credits')
      .eq('id', organizationId)
      .single()

    const currentCredits = org?.monthly_discovery_credits || 0

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        monthly_discovery_credits: currentCredits + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)

    if (updateError) {
      throw new Error(`Failed to deduct usage: ${updateError.message}`)
    }
  }

  // Log the deduction for audit purposes
  console.log(`[Usage] Deducted ${amount} lookups from org ${organizationId}: ${reason}`)
}

// ============================================================================
// Reset Credits If Needed
// ============================================================================

async function resetCreditsIfNeeded(organizationId: string): Promise<void> {
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('credits_reset_at')
    .eq('id', organizationId)
    .single()

  if (!org) return

  const resetAt = org.credits_reset_at ? new Date(org.credits_reset_at) : null
  const now = new Date()

  // Check if we need to reset (new billing period)
  if (!resetAt || isNewBillingPeriod(resetAt, now)) {
    await supabase
      .from('organizations')
      .update({
        monthly_discovery_credits: 0,
        credits_reset_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', organizationId)

    console.log(`[Usage] Reset credits for org ${organizationId}`)
  }
}

// ============================================================================
// Validate Usage Before Action
// ============================================================================

export async function validateUsage(
  organizationId: string,
  requiredAmount: number
): Promise<{ allowed: boolean; quota: UsageQuota; message?: string }> {
  const quota = await checkUsageQuota(organizationId)

  if (quota.lookups_remaining < requiredAmount) {
    return {
      allowed: false,
      quota,
      message: `Insufficient credits. You have ${quota.lookups_remaining} lookups remaining, but need ${requiredAmount}. Please upgrade your plan or wait for credits to reset on ${new Date(quota.period_end).toLocaleDateString()}.`,
    }
  }

  return {
    allowed: true,
    quota,
  }
}

// ============================================================================
// Get Organization Usage Summary
// ============================================================================

export async function getUsageSummary(organizationId: string): Promise<{
  discovery: UsageQuota
  outreach: { used: number; limit: number; remaining: number }
}> {
  const supabase = await createClient()

  const { data: org, error } = await supabase
    .from('organizations')
    .select('subscription_plan, monthly_discovery_credits, monthly_outreach_credits, credits_reset_at')
    .eq('id', organizationId)
    .single()

  if (error || !org) {
    throw new Error(`Failed to fetch organization: ${error?.message || 'Not found'}`)
  }

  const plan = org.subscription_plan as SubscriptionPlan
  const discoveryLimit = getLookupLimit(plan)
  const outreachLimit = getOutreachLimit(plan)
  const discoveryUsed = org.monthly_discovery_credits || 0
  const outreachUsed = org.monthly_outreach_credits || 0
  const creditsResetAt = org.credits_reset_at ? new Date(org.credits_reset_at) : new Date()

  const periodStart = getMonthStart(creditsResetAt)
  const periodEnd = getMonthEnd(creditsResetAt)

  return {
    discovery: {
      lookups_used: discoveryUsed,
      lookups_limit: discoveryLimit,
      lookups_remaining: Math.max(0, discoveryLimit - discoveryUsed),
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      plan,
    },
    outreach: {
      used: outreachUsed,
      limit: outreachLimit,
      remaining: Math.max(0, outreachLimit - outreachUsed),
    },
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function isNewBillingPeriod(lastReset: Date, now: Date): boolean {
  const lastMonth = lastReset.getMonth()
  const lastYear = lastReset.getFullYear()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return currentYear > lastYear || (currentYear === lastYear && currentMonth > lastMonth)
}
