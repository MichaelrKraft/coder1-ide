import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getSubscription,
  cancelSubscription,
  resumeSubscription,
  getUpcomingInvoice,
  getMockSubscription,
  isStripeMockMode,
  PLAN_FEATURES,
  type PlanType,
} from "@/lib/stripe"
import { getUsageSummary } from "@/lib/usage"

export interface SubscriptionResponse {
  subscription: {
    id: string
    status: string
    plan: PlanType
    planName: string
    price: number
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  } | null
  usage: {
    lookups: { used: number; limit: number; remaining: number }
    outreach: { used: number; limit: number; remaining: number }
  }
  upcomingInvoice: {
    amount: number
    currency: string
    dueDate: string
  } | null
  isMockMode: boolean
}

/**
 * GET /api/billing/subscription
 * Get current subscription status and usage
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: "Unauthorized" } },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations(*)")
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: { message: "Organization not found" } },
        { status: 404 }
      )
    }

    const organization = membership.organizations as {
      id: string
      subscription_plan: string
      subscription_status: string
      stripe_customer_id: string | null
      stripe_subscription_id: string | null
    }

    // Get subscription details
    let subscriptionData = null
    let upcomingInvoice = null

    if (organization.stripe_subscription_id) {
      const subscription = await getSubscription(organization.stripe_subscription_id)

      if (subscription) {
        const planFeatures = PLAN_FEATURES[subscription.plan]
        subscriptionData = {
          id: subscription.id,
          status: subscription.status,
          plan: subscription.plan,
          planName: planFeatures.name,
          price: planFeatures.price,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      }

      // Get upcoming invoice
      if (organization.stripe_customer_id) {
        upcomingInvoice = await getUpcomingInvoice(organization.stripe_customer_id)
      }
    } else if (isStripeMockMode()) {
      // Return mock data for development
      const mockSub = getMockSubscription()
      const planFeatures = PLAN_FEATURES[mockSub.plan]
      subscriptionData = {
        id: mockSub.id,
        status: mockSub.status,
        plan: mockSub.plan,
        planName: planFeatures.name,
        price: planFeatures.price,
        currentPeriodStart: mockSub.currentPeriodStart,
        currentPeriodEnd: mockSub.currentPeriodEnd,
        cancelAtPeriodEnd: mockSub.cancelAtPeriodEnd,
      }
      upcomingInvoice = {
        amount: planFeatures.price * 100,
        currency: "usd",
        dueDate: mockSub.currentPeriodEnd,
      }
    }

    // Get usage data
    let usage = {
      lookups: { used: 0, limit: 500, remaining: 500 },
      outreach: { used: 0, limit: 500, remaining: 500 },
    }

    try {
      const usageSummary = await getUsageSummary(organization.id)
      usage = {
        lookups: {
          used: usageSummary.discovery.lookups_used,
          limit: usageSummary.discovery.lookups_limit,
          remaining: usageSummary.discovery.lookups_remaining,
        },
        outreach: usageSummary.outreach,
      }
    } catch (usageError) {
      console.warn("[Billing] Failed to get usage summary:", usageError)
    }

    const response: SubscriptionResponse = {
      subscription: subscriptionData,
      usage,
      upcomingInvoice,
      isMockMode: isStripeMockMode(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[Billing Subscription] Error:", error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : "Failed to get subscription",
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/billing/subscription
 * Cancel the current subscription (at period end)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: "Unauthorized" } },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations(*)")
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: { message: "Organization not found" } },
        { status: 404 }
      )
    }

    // Only owners can cancel subscription
    if (membership.role !== "owner") {
      return NextResponse.json(
        { error: { message: "Only organization owners can cancel subscriptions" } },
        { status: 403 }
      )
    }

    const organization = membership.organizations as {
      id: string
      stripe_subscription_id: string | null
    }

    if (!organization.stripe_subscription_id) {
      return NextResponse.json(
        { error: { message: "No active subscription found" } },
        { status: 400 }
      )
    }

    // Cancel at period end (not immediately)
    const result = await cancelSubscription(organization.stripe_subscription_id, false)

    if (!result) {
      return NextResponse.json(
        { error: { message: "Failed to cancel subscription" } },
        { status: 500 }
      )
    }

    // Update organization status
    await supabase
      .from("organizations")
      .update({
        subscription_status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", organization.id)

    return NextResponse.json({
      message: "Subscription will be canceled at the end of the billing period",
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
      periodEnd: result.currentPeriodEnd,
    })
  } catch (error) {
    console.error("[Billing Cancel] Error:", error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : "Failed to cancel subscription",
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/billing/subscription
 * Resume a canceled subscription or update subscription status
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body // "resume" action

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: "Unauthorized" } },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations(*)")
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: { message: "Organization not found" } },
        { status: 404 }
      )
    }

    // Only owners and admins can manage subscription
    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: { message: "Insufficient permissions" } },
        { status: 403 }
      )
    }

    const organization = membership.organizations as {
      id: string
      stripe_subscription_id: string | null
    }

    if (!organization.stripe_subscription_id) {
      return NextResponse.json(
        { error: { message: "No subscription found" } },
        { status: 400 }
      )
    }

    if (action === "resume") {
      const result = await resumeSubscription(organization.stripe_subscription_id)

      if (!result) {
        return NextResponse.json(
          { error: { message: "Failed to resume subscription" } },
          { status: 500 }
        )
      }

      // Update organization status
      await supabase
        .from("organizations")
        .update({
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", organization.id)

      return NextResponse.json({
        message: "Subscription resumed successfully",
        subscription: result,
      })
    }

    return NextResponse.json(
      { error: { message: "Invalid action" } },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Billing Update] Error:", error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : "Failed to update subscription",
        },
      },
      { status: 500 }
    )
  }
}
