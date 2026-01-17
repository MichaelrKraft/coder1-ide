import { getStripeClient, PRICE_IDS, getPlanFromPriceId, isStripeMockMode } from "./client"
import { getMockSubscription, getMockCheckoutUrl, getMockPortalUrl } from "./mock"
import type { PlanType } from "./client"

export interface SubscriptionDetails {
  id: string
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "unpaid"
  plan: PlanType
  priceId: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  customerId: string
}

/**
 * Create a Stripe Checkout session for new subscriptions
 */
export async function createCheckoutSession(
  organizationId: string,
  plan: PlanType,
  successUrl: string,
  cancelUrl: string,
  customerId?: string
): Promise<string> {
  const stripe = getStripeClient()

  if (!stripe) {
    console.log("[Stripe Mock] Creating mock checkout session")
    return getMockCheckoutUrl(plan, successUrl)
  }

  const priceId = PRICE_IDS[plan]

  const sessionConfig: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      organization_id: organizationId,
      plan: plan,
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    subscription_data: {
      metadata: {
        organization_id: organizationId,
        plan: plan,
      },
    },
  }

  // If customer already exists, attach to their account
  if (customerId) {
    sessionConfig.customer = customerId
  } else {
    sessionConfig.customer_creation = "always"
  }

  const session = await stripe.checkout.sessions.create(sessionConfig)

  if (!session.url) {
    throw new Error("Failed to create checkout session URL")
  }

  return session.url
}

/**
 * Create a Stripe Billing Portal session for managing subscriptions
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripeClient()

  if (!stripe) {
    console.log("[Stripe Mock] Creating mock billing portal session")
    return getMockPortalUrl(returnUrl)
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session.url
}

/**
 * Get subscription details by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<SubscriptionDetails | null> {
  const stripe = getStripeClient()

  if (!stripe) {
    console.log("[Stripe Mock] Returning mock subscription")
    return getMockSubscription()
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    })

    const priceId = subscription.items.data[0]?.price?.id || ""
    const plan = getPlanFromPriceId(priceId) || "starter"

    return {
      id: subscription.id,
      status: subscription.status as SubscriptionDetails["status"],
      plan,
      priceId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      customerId: subscription.customer as string,
    }
  } catch (error) {
    console.error("[Stripe] Failed to get subscription:", error)
    return null
  }
}

/**
 * Cancel a subscription (at period end by default)
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelImmediately = false
): Promise<SubscriptionDetails | null> {
  const stripe = getStripeClient()

  if (!stripe) {
    console.log("[Stripe Mock] Mock canceling subscription")
    const mock = getMockSubscription()
    if (mock) {
      mock.cancelAtPeriodEnd = true
    }
    return mock
  }

  try {
    let subscription

    if (cancelImmediately) {
      subscription = await stripe.subscriptions.cancel(subscriptionId)
    } else {
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
    }

    const priceId = subscription.items.data[0]?.price?.id || ""
    const plan = getPlanFromPriceId(priceId) || "starter"

    return {
      id: subscription.id,
      status: subscription.status as SubscriptionDetails["status"],
      plan,
      priceId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      customerId: subscription.customer as string,
    }
  } catch (error) {
    console.error("[Stripe] Failed to cancel subscription:", error)
    return null
  }
}

/**
 * Resume a canceled subscription (if canceled at period end)
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<SubscriptionDetails | null> {
  const stripe = getStripeClient()

  if (!stripe) {
    console.log("[Stripe Mock] Mock resuming subscription")
    const mock = getMockSubscription()
    if (mock) {
      mock.cancelAtPeriodEnd = false
    }
    return mock
  }

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    const priceId = subscription.items.data[0]?.price?.id || ""
    const plan = getPlanFromPriceId(priceId) || "starter"

    return {
      id: subscription.id,
      status: subscription.status as SubscriptionDetails["status"],
      plan,
      priceId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      customerId: subscription.customer as string,
    }
  } catch (error) {
    console.error("[Stripe] Failed to resume subscription:", error)
    return null
  }
}

/**
 * Update subscription to a different plan
 */
export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPlan: PlanType
): Promise<SubscriptionDetails | null> {
  const stripe = getStripeClient()

  if (!stripe) {
    console.log("[Stripe Mock] Mock updating subscription plan")
    const mock = getMockSubscription()
    if (mock) {
      mock.plan = newPlan
      mock.priceId = PRICE_IDS[newPlan]
    }
    return mock
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const newPriceId = PRICE_IDS[newPlan]

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: "create_prorations",
      metadata: {
        plan: newPlan,
      },
    })

    return {
      id: updatedSubscription.id,
      status: updatedSubscription.status as SubscriptionDetails["status"],
      plan: newPlan,
      priceId: newPriceId,
      currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      customerId: updatedSubscription.customer as string,
    }
  } catch (error) {
    console.error("[Stripe] Failed to update subscription:", error)
    return null
  }
}

/**
 * Get or create a Stripe customer
 */
export async function getOrCreateCustomer(
  email: string,
  organizationId: string,
  organizationName?: string
): Promise<string | null> {
  const stripe = getStripeClient()

  if (!stripe) {
    console.log("[Stripe Mock] Returning mock customer ID")
    return "cus_mock_" + organizationId.slice(0, 8)
  }

  try {
    // Check for existing customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0].id
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name: organizationName,
      metadata: {
        organization_id: organizationId,
      },
    })

    return customer.id
  } catch (error) {
    console.error("[Stripe] Failed to get or create customer:", error)
    return null
  }
}

/**
 * Verify a checkout session was completed successfully
 */
export async function verifyCheckoutSession(sessionId: string): Promise<{
  success: boolean
  customerId?: string
  subscriptionId?: string
  plan?: PlanType
  organizationId?: string
}> {
  const stripe = getStripeClient()

  if (!stripe) {
    console.log("[Stripe Mock] Verifying mock checkout session")
    return {
      success: true,
      customerId: "cus_mock_123",
      subscriptionId: "sub_mock_123",
      plan: "growth",
      organizationId: "org_mock_123",
    }
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })

    if (session.payment_status !== "paid") {
      return { success: false }
    }

    const plan = (session.metadata?.plan as PlanType) || "starter"

    return {
      success: true,
      customerId: session.customer as string,
      subscriptionId: session.subscription as string,
      plan,
      organizationId: session.metadata?.organization_id,
    }
  } catch (error) {
    console.error("[Stripe] Failed to verify checkout session:", error)
    return { success: false }
  }
}

/**
 * Get upcoming invoice for a subscription
 */
export async function getUpcomingInvoice(customerId: string): Promise<{
  amount: number
  currency: string
  dueDate: string
} | null> {
  const stripe = getStripeClient()

  if (!stripe) {
    console.log("[Stripe Mock] Returning mock upcoming invoice")
    return {
      amount: 29900,
      currency: "usd",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }

  try {
    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    })

    return {
      amount: invoice.amount_due,
      currency: invoice.currency,
      dueDate: invoice.due_date
        ? new Date(invoice.due_date * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  } catch (error) {
    console.error("[Stripe] Failed to get upcoming invoice:", error)
    return null
  }
}

// Re-export for convenience
export { isStripeMockMode }
