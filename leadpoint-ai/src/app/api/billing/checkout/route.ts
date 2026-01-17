import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createCheckoutSession,
  getOrCreateCustomer,
  PRICE_IDS,
  type PlanType,
} from "@/lib/stripe"

interface CheckoutRequest {
  plan: PlanType
}

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session for subscribing to a plan
 */
export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequest = await request.json()
    const { plan } = body

    // Validate plan
    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json(
        { error: { message: "Invalid plan specified" } },
        { status: 400 }
      )
    }

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

    // Only owners and admins can manage billing
    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: { message: "Insufficient permissions to manage billing" } },
        { status: 403 }
      )
    }

    const organization = membership.organizations as {
      id: string
      name: string
      stripe_customer_id: string | null
    }

    // Get or create Stripe customer
    let customerId = organization.stripe_customer_id

    if (!customerId) {
      customerId = await getOrCreateCustomer(
        user.email!,
        organization.id,
        organization.name
      )

      if (customerId) {
        // Save customer ID to organization
        await supabase
          .from("organizations")
          .update({
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", organization.id)
      }
    }

    // Build success and cancel URLs
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const successUrl = `${origin}/settings/billing?success=true`
    const cancelUrl = `${origin}/settings/billing?canceled=true`

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      organization.id,
      plan,
      successUrl,
      cancelUrl,
      customerId || undefined
    )

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    console.error("[Billing Checkout] Error:", error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : "Failed to create checkout session",
        },
      },
      { status: 500 }
    )
  }
}
