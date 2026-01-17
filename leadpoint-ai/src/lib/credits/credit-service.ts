/**
 * Credit Tracking Service for LeadPoint.ai
 *
 * Manages organization credits for AI operations with:
 * - Per-operation credit costs
 * - Monthly reset logic
 * - Concurrent-safe atomic updates
 * - Clear error messages with reset dates
 */

import { createClient } from '@/lib/supabase/server'
import type { SubscriptionPlan } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

export type CreditOperation =
  | 'brief_generation'
  | 'outreach_generation'
  | 'series_variation'
  | 'influencer_discovery'

export interface CreditCheckResult {
  allowed: boolean
  currentBalance: number
  requiredCredits: number
  remainingAfter: number
  resetDate: string
  message?: string
}

export interface DeductResult {
  success: boolean
  previousBalance: number
  newBalance: number
  creditsDeducted: number
  error?: string
}

export interface CreditBalance {
  discovery: {
    used: number
    limit: number
    remaining: number
  }
  outreach: {
    used: number
    limit: number
    remaining: number
  }
  resetDate: string
  plan: SubscriptionPlan
}

// ============================================================================
// Credit Costs per Operation
// ============================================================================

export const CREDIT_COSTS: Record<CreditOperation, number> = {
  brief_generation: 5,
  outreach_generation: 3,
  series_variation: 2,
  influencer_discovery: 1, // per influencer discovered
}

// ============================================================================
// Monthly Credit Limits by Plan
// ============================================================================

const DISCOVERY_LIMITS: Record<SubscriptionPlan, number> = {
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
// Helper Functions
// ============================================================================

function getDiscoveryLimit(plan: SubscriptionPlan): number {
  return DISCOVERY_LIMITS[plan]
}

function getOutreachLimit(plan: SubscriptionPlan): number {
  return OUTREACH_LIMITS[plan]
}

function isNewBillingPeriod(lastReset: Date, now: Date): boolean {
  const lastMonth = lastReset.getMonth()
  const lastYear = lastReset.getFullYear()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return currentYear > lastYear || (currentYear === lastYear && currentMonth > lastMonth)
}

function getNextResetDate(creditsResetAt: Date): Date {
  // Reset happens on the 1st of next month
  const nextMonth = new Date(creditsResetAt)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  nextMonth.setDate(1)
  nextMonth.setHours(0, 0, 0, 0)
  return nextMonth
}

function formatResetDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Determine which credit pool an operation uses
 */
function getCreditPool(operation: CreditOperation): 'discovery' | 'outreach' {
  switch (operation) {
    case 'brief_generation':
    case 'series_variation':
    case 'influencer_discovery':
      return 'discovery'
    case 'outreach_generation':
      return 'outreach'
    default:
      return 'discovery'
  }
}

// ============================================================================
// Credit Service Implementation
// ============================================================================

/**
 * Check and reset credits if a new billing period has started.
 * This should be called before any credit check or deduction.
 */
export async function checkAndResetIfNeeded(organizationId: string): Promise<void> {
  const supabase = await createClient()

  const { data: org, error } = await supabase
    .from('organizations')
    .select('credits_reset_at')
    .eq('id', organizationId)
    .single()

  if (error || !org) {
    console.error('[Credits] Failed to fetch organization for reset check:', error?.message)
    return
  }

  const resetAt = org.credits_reset_at ? new Date(org.credits_reset_at) : null
  const now = new Date()

  // Check if we need to reset (new billing period)
  if (!resetAt || isNewBillingPeriod(resetAt, now)) {
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        monthly_discovery_credits: 0,
        monthly_outreach_credits: 0,
        credits_reset_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', organizationId)

    if (updateError) {
      console.error('[Credits] Failed to reset credits:', updateError.message)
    } else {
      console.log(`[Credits] Reset credits for org ${organizationId} - new billing period`)
    }
  }
}

/**
 * Check if an organization has enough credits for an operation.
 * Does NOT deduct credits - use deductCredits after successful operation.
 */
export async function hasCredits(
  organizationId: string,
  operation: CreditOperation,
  amount: number = 1
): Promise<CreditCheckResult> {
  const supabase = await createClient()

  // First, check and reset if needed
  await checkAndResetIfNeeded(organizationId)

  // Get organization data
  const { data: org, error } = await supabase
    .from('organizations')
    .select('subscription_plan, monthly_discovery_credits, monthly_outreach_credits, credits_reset_at')
    .eq('id', organizationId)
    .single()

  if (error || !org) {
    return {
      allowed: false,
      currentBalance: 0,
      requiredCredits: CREDIT_COSTS[operation] * amount,
      remainingAfter: 0,
      resetDate: new Date().toISOString(),
      message: `Failed to fetch organization: ${error?.message || 'Not found'}`,
    }
  }

  const plan = org.subscription_plan as SubscriptionPlan
  const pool = getCreditPool(operation)
  const creditCost = CREDIT_COSTS[operation] * amount

  // Calculate based on which credit pool
  let used: number
  let limit: number

  if (pool === 'discovery') {
    used = org.monthly_discovery_credits || 0
    limit = getDiscoveryLimit(plan)
  } else {
    used = org.monthly_outreach_credits || 0
    limit = getOutreachLimit(plan)
  }

  const remaining = Math.max(0, limit - used)
  const remainingAfter = remaining - creditCost
  const allowed = remainingAfter >= 0

  const resetAt = org.credits_reset_at ? new Date(org.credits_reset_at) : new Date()
  const nextResetDate = getNextResetDate(resetAt)

  const result: CreditCheckResult = {
    allowed,
    currentBalance: remaining,
    requiredCredits: creditCost,
    remainingAfter: Math.max(0, remainingAfter),
    resetDate: nextResetDate.toISOString(),
  }

  if (!allowed) {
    result.message = `Monthly credit limit exceeded. You have ${remaining} credits remaining but need ${creditCost}. Upgrade your plan or wait for credits to reset on ${formatResetDate(nextResetDate)}.`
  }

  return result
}

/**
 * Deduct credits after a successful operation.
 * Uses atomic increment to handle concurrent requests safely.
 *
 * IMPORTANT: Only call this AFTER the operation succeeds.
 */
export async function deductCredits(
  organizationId: string,
  operation: CreditOperation,
  amount: number = 1
): Promise<DeductResult> {
  const supabase = await createClient()

  const creditCost = CREDIT_COSTS[operation] * amount
  const pool = getCreditPool(operation)

  // Get current balance first
  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('subscription_plan, monthly_discovery_credits, monthly_outreach_credits')
    .eq('id', organizationId)
    .single()

  if (fetchError || !org) {
    return {
      success: false,
      previousBalance: 0,
      newBalance: 0,
      creditsDeducted: 0,
      error: `Failed to fetch organization: ${fetchError?.message || 'Not found'}`,
    }
  }

  const previousBalance = pool === 'discovery'
    ? org.monthly_discovery_credits || 0
    : org.monthly_outreach_credits || 0

  // Try to use RPC for atomic increment (if available)
  const rpcName = pool === 'discovery' ? 'increment_discovery_credits' : 'increment_outreach_credits'

  const { error: rpcError } = await supabase.rpc(rpcName, {
    org_id: organizationId,
    credit_amount: creditCost,
  })

  if (rpcError) {
    // Fallback to direct update if RPC doesn't exist
    console.warn(`[Credits] RPC ${rpcName} not available, using direct update:`, rpcError.message)

    const updateField = pool === 'discovery' ? 'monthly_discovery_credits' : 'monthly_outreach_credits'
    const newBalance = previousBalance + creditCost

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        [updateField]: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)

    if (updateError) {
      return {
        success: false,
        previousBalance,
        newBalance: previousBalance,
        creditsDeducted: 0,
        error: `Failed to deduct credits: ${updateError.message}`,
      }
    }

    console.log(`[Credits] Deducted ${creditCost} ${pool} credits from org ${organizationId} for ${operation}`)

    return {
      success: true,
      previousBalance,
      newBalance,
      creditsDeducted: creditCost,
    }
  }

  // RPC succeeded
  const newBalance = previousBalance + creditCost
  console.log(`[Credits] Deducted ${creditCost} ${pool} credits from org ${organizationId} for ${operation}`)

  return {
    success: true,
    previousBalance,
    newBalance,
    creditsDeducted: creditCost,
  }
}

/**
 * Get the current credit balance for an organization.
 */
export async function getBalance(organizationId: string): Promise<CreditBalance> {
  const supabase = await createClient()

  // First, check and reset if needed
  await checkAndResetIfNeeded(organizationId)

  const { data: org, error } = await supabase
    .from('organizations')
    .select('subscription_plan, monthly_discovery_credits, monthly_outreach_credits, credits_reset_at')
    .eq('id', organizationId)
    .single()

  if (error || !org) {
    throw new Error(`Failed to fetch organization: ${error?.message || 'Not found'}`)
  }

  const plan = org.subscription_plan as SubscriptionPlan
  const discoveryLimit = getDiscoveryLimit(plan)
  const outreachLimit = getOutreachLimit(plan)
  const discoveryUsed = org.monthly_discovery_credits || 0
  const outreachUsed = org.monthly_outreach_credits || 0
  const resetAt = org.credits_reset_at ? new Date(org.credits_reset_at) : new Date()
  const nextResetDate = getNextResetDate(resetAt)

  return {
    discovery: {
      used: discoveryUsed,
      limit: discoveryLimit,
      remaining: Math.max(0, discoveryLimit - discoveryUsed),
    },
    outreach: {
      used: outreachUsed,
      limit: outreachLimit,
      remaining: Math.max(0, outreachLimit - outreachUsed),
    },
    resetDate: nextResetDate.toISOString(),
    plan,
  }
}

/**
 * Validate credits before an operation.
 * Returns a standardized response for API error handling.
 */
export async function validateCreditsForOperation(
  organizationId: string,
  operation: CreditOperation,
  amount: number = 1
): Promise<{
  allowed: boolean
  errorResponse?: {
    code: string
    message: string
    status: number
    details: {
      credits_required: number
      credits_remaining: number
      reset_date: string
    }
  }
}> {
  const checkResult = await hasCredits(organizationId, operation, amount)

  if (!checkResult.allowed) {
    return {
      allowed: false,
      errorResponse: {
        code: 'CREDITS_EXCEEDED',
        message: checkResult.message || 'Monthly credit limit exceeded. Upgrade your plan or wait for credits to reset.',
        status: 402, // Payment Required
        details: {
          credits_required: checkResult.requiredCredits,
          credits_remaining: checkResult.currentBalance,
          reset_date: checkResult.resetDate,
        },
      },
    }
  }

  return { allowed: true }
}
