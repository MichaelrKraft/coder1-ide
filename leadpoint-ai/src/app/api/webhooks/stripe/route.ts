import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { getStripeClient, getPlanFromPriceId, PLAN_FEATURES, type PlanType } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { sendPaymentFailedEmail, sendSubscriptionUpdatedEmail } from "@/lib/email"

// Create admin Supabase client for webhooks (bypasses RLS)
function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables for webhook processing")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Get the organization owner's email and name for notifications
 */
async function getOrganizationOwnerEmail(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<{ email: string; name: string | null } | null> {
  // First get the owner's user_id from organization_members
  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .single()

  if (memberError || !member) {
    console.warn("[Stripe Webhook] Could not find owner for organization:", organizationId)
    return null
  }

  const memberData = member as { user_id: string }

  // Then get the user's email from user_profiles
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("email, full_name")
    .eq("id", memberData.user_id)
    .single()

  if (profileError || !profile) {
    console.warn("[Stripe Webhook] Could not find profile for user:", memberData.user_id)
    return null
  }

  const profileData = profile as { email: string; full_name: string | null }

  return {
    email: profileData.email,
    name: profileData.full_name,
  }
}

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const stripe = getStripeClient()

  // If no Stripe client (mock mode), acknowledge webhook
  if (!stripe) {
    console.log("[Stripe Webhook] Mock mode - acknowledging webhook")
    return NextResponse.json({ received: true, mock: true })
  }

  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header")
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET")
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Stripe Webhook] Signature verification failed:", message)
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    )
  }

  const supabase = getAdminSupabase()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(supabase, session)
        break
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(supabase, subscription)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(supabase, subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(supabase, invoice)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(supabase, invoice)
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout.session.completed event
 * Called when a customer completes checkout
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session
) {
  console.log("[Stripe Webhook] Checkout completed:", session.id)

  const organizationId = session.metadata?.organization_id
  const plan = session.metadata?.plan as PlanType | undefined

  if (!organizationId) {
    console.error("[Stripe Webhook] No organization_id in session metadata")
    return
  }

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Update organization with Stripe IDs
  const { error } = await supabase
    .from("organizations")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_plan: plan || "starter",
      subscription_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId)

  if (error) {
    console.error("[Stripe Webhook] Failed to update organization:", error)
    throw error
  }

  console.log(`[Stripe Webhook] Organization ${organizationId} subscribed to ${plan || "starter"}`)
}

/**
 * Handle customer.subscription.created event
 * Called when a new subscription is created
 */
async function handleSubscriptionCreated(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  console.log("[Stripe Webhook] Subscription created:", subscription.id)

  const organizationId = subscription.metadata?.organization_id

  if (!organizationId) {
    console.warn("[Stripe Webhook] No organization_id in subscription metadata")
    return
  }

  const priceId = subscription.items.data[0]?.price?.id
  const plan = priceId ? getPlanFromPriceId(priceId) : "starter"

  const { error } = await supabase
    .from("organizations")
    .update({
      stripe_subscription_id: subscription.id,
      subscription_plan: plan,
      subscription_status: subscription.status as string,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId)

  if (error) {
    console.error("[Stripe Webhook] Failed to update organization:", error)
    throw error
  }
}

/**
 * Handle customer.subscription.updated event
 * Called when a subscription is updated (plan change, renewal, etc.)
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  console.log("[Stripe Webhook] Subscription updated:", subscription.id)

  // Find organization by subscription ID
  let organizationId: string | null = null
  let oldPlan: string | null = null

  const { data: org, error: findError } = await supabase
    .from("organizations")
    .select("id, subscription_plan")
    .eq("stripe_subscription_id", subscription.id)
    .single()

  if (findError || !org) {
    // Try finding by customer ID
    const customerId = subscription.customer as string
    const { data: orgByCustomer, error: customerError } = await supabase
      .from("organizations")
      .select("id, subscription_plan")
      .eq("stripe_customer_id", customerId)
      .single()

    if (customerError || !orgByCustomer) {
      console.warn("[Stripe Webhook] Organization not found for subscription:", subscription.id)
      return
    }

    organizationId = orgByCustomer.id
    oldPlan = orgByCustomer.subscription_plan

    // Update with subscription ID
    const priceId = subscription.items.data[0]?.price?.id
    const plan = priceId ? getPlanFromPriceId(priceId) : null
    const planFeatures = plan ? PLAN_FEATURES[plan] : null

    const { error } = await supabase
      .from("organizations")
      .update({
        stripe_subscription_id: subscription.id,
        subscription_plan: plan || "starter",
        subscription_status: subscription.status as string,
        // Update credits based on new plan
        ...(planFeatures && {
          monthly_discovery_credits: 0, // Reset on plan change
          monthly_outreach_credits: 0,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgByCustomer.id)

    if (error) {
      console.error("[Stripe Webhook] Failed to update organization:", error)
      throw error
    }

    // Send email if plan changed
    if (plan && oldPlan && plan !== oldPlan) {
      await sendSubscriptionUpdateEmail(supabase, organizationId, oldPlan, plan)
    }

    return
  }

  organizationId = org.id
  oldPlan = org.subscription_plan

  const priceId = subscription.items.data[0]?.price?.id
  const plan = priceId ? getPlanFromPriceId(priceId) : null

  const updateData: Record<string, unknown> = {
    subscription_status: subscription.status as string,
    updated_at: new Date().toISOString(),
  }

  if (plan) {
    updateData.subscription_plan = plan
  }

  // Handle cancel_at_period_end
  if (subscription.cancel_at_period_end) {
    updateData.subscription_status = "canceled"
  } else if (subscription.status === "active") {
    updateData.subscription_status = "active"
  }

  const { error } = await supabase
    .from("organizations")
    .update(updateData)
    .eq("id", org.id)

  if (error) {
    console.error("[Stripe Webhook] Failed to update organization:", error)
    throw error
  }

  console.log(`[Stripe Webhook] Organization ${org.id} subscription updated to ${plan || "unchanged"}`)

  // Send email if plan changed
  if (plan && oldPlan && plan !== oldPlan) {
    await sendSubscriptionUpdateEmail(supabase, organizationId, oldPlan, plan)
  }
}

/**
 * Helper to send subscription update email
 */
async function sendSubscriptionUpdateEmail(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  oldPlan: string,
  newPlan: string
) {
  const owner = await getOrganizationOwnerEmail(supabase, organizationId)
  if (!owner) return

  // Get plan features for the new plan to list in email
  const newPlanFeatures = PLAN_FEATURES[newPlan as PlanType]
  const newFeatures: string[] = []

  if (newPlanFeatures) {
    newFeatures.push(`${newPlanFeatures.lookups.toLocaleString()} influencer lookups per month`)
    newFeatures.push(`${newPlanFeatures.outreach.toLocaleString()} outreach messages per month`)
    const campaigns = newPlanFeatures.campaigns === -1 ? 'Unlimited' : newPlanFeatures.campaigns
    newFeatures.push(`${campaigns} active campaigns`)
    newFeatures.push(`${newPlanFeatures.team_members} team member${newPlanFeatures.team_members > 1 ? 's' : ''}`)
  }

  const result = await sendSubscriptionUpdatedEmail(
    { email: owner.email, name: owner.name },
    oldPlan,
    newPlan,
    {
      effectiveDate: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      newFeatures: newFeatures.length > 0 ? newFeatures : undefined,
    }
  )

  if (result.success) {
    console.log(`[Stripe Webhook] Subscription update email sent to ${owner.email}`)
  } else {
    console.error(`[Stripe Webhook] Failed to send subscription update email:`, result.error)
  }
}

/**
 * Handle customer.subscription.deleted event
 * Called when a subscription is canceled/deleted
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  console.log("[Stripe Webhook] Subscription deleted:", subscription.id)

  // Find organization by subscription ID
  const { data: org, error: findError } = await supabase
    .from("organizations")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .single()

  if (findError || !org) {
    console.warn("[Stripe Webhook] Organization not found for deleted subscription:", subscription.id)
    return
  }

  // Downgrade to free plan
  const { error } = await supabase
    .from("organizations")
    .update({
      subscription_plan: "free",
      subscription_status: "canceled",
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", org.id)

  if (error) {
    console.error("[Stripe Webhook] Failed to update organization:", error)
    throw error
  }

  console.log(`[Stripe Webhook] Organization ${org.id} downgraded to free plan`)
}

/**
 * Handle invoice.paid event
 * Called when an invoice is successfully paid
 */
async function handleInvoicePaid(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
) {
  console.log("[Stripe Webhook] Invoice paid:", invoice.id)

  const customerId = invoice.customer as string

  // Find organization by customer ID
  const { data: org, error: findError } = await supabase
    .from("organizations")
    .select("id, subscription_plan")
    .eq("stripe_customer_id", customerId)
    .single()

  if (findError || !org) {
    console.warn("[Stripe Webhook] Organization not found for customer:", customerId)
    return
  }

  // Reset monthly credits on successful payment (billing cycle renewal)
  if (invoice.billing_reason === "subscription_cycle") {
    const { error } = await supabase
      .from("organizations")
      .update({
        monthly_discovery_credits: 0,
        monthly_outreach_credits: 0,
        credits_reset_at: new Date().toISOString(),
        subscription_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", org.id)

    if (error) {
      console.error("[Stripe Webhook] Failed to reset credits:", error)
      throw error
    }

    console.log(`[Stripe Webhook] Credits reset for organization ${org.id}`)
  }
}

/**
 * Handle invoice.payment_failed event
 * Called when a payment fails
 */
async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
) {
  console.log("[Stripe Webhook] Invoice payment failed:", invoice.id)

  const customerId = invoice.customer as string

  // Find organization by customer ID
  const { data: org, error: findError } = await supabase
    .from("organizations")
    .select("id, subscription_plan")
    .eq("stripe_customer_id", customerId)
    .single()

  if (findError || !org) {
    console.warn("[Stripe Webhook] Organization not found for customer:", customerId)
    return
  }

  // Update subscription status to past_due
  const { error } = await supabase
    .from("organizations")
    .update({
      subscription_status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", org.id)

  if (error) {
    console.error("[Stripe Webhook] Failed to update organization:", error)
    throw error
  }

  console.log(`[Stripe Webhook] Organization ${org.id} marked as past_due`)

  // Send email notification about failed payment
  const owner = await getOrganizationOwnerEmail(supabase, org.id)
  if (owner) {
    const planName = PLAN_FEATURES[org.subscription_plan as PlanType]?.name || org.subscription_plan
    const amountDue = invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : undefined
    const currency = invoice.currency?.toUpperCase() === 'USD' ? '$' : invoice.currency?.toUpperCase()

    // Calculate next retry date (Stripe typically retries 3 days after)
    const nextRetryDate = invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : undefined

    const result = await sendPaymentFailedEmail(
      { email: owner.email, name: owner.name },
      {
        planName,
        amount: amountDue,
        currency,
        nextRetryDate,
      }
    )

    if (result.success) {
      console.log(`[Stripe Webhook] Payment failed email sent to ${owner.email}`)
    } else {
      console.error(`[Stripe Webhook] Failed to send payment failed email:`, result.error)
    }
  }
}

// Route segment config for raw body (App Router style)
// Note: In App Router, request.text() already gives us the raw body,
// so no special config is needed unlike Pages Router
