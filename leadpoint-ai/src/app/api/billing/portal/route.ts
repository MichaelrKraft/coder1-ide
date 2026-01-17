import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createBillingPortalSession } from "@/lib/stripe"

/**
 * POST /api/billing/portal
 * Create a Stripe Billing Portal session for managing subscription
 */
export async function POST(request: NextRequest) {
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

    // Only owners and admins can access billing portal
    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: { message: "Insufficient permissions to access billing" } },
        { status: 403 }
      )
    }

    const organization = membership.organizations as {
      id: string
      stripe_customer_id: string | null
    }

    // Check if organization has a Stripe customer
    if (!organization.stripe_customer_id) {
      return NextResponse.json(
        { error: { message: "No billing account found. Please subscribe to a plan first." } },
        { status: 400 }
      )
    }

    // Build return URL
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const returnUrl = `${origin}/settings/billing`

    // Create billing portal session
    const portalUrl = await createBillingPortalSession(
      organization.stripe_customer_id,
      returnUrl
    )

    return NextResponse.json({ url: portalUrl })
  } catch (error) {
    console.error("[Billing Portal] Error:", error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : "Failed to create billing portal session",
        },
      },
      { status: 500 }
    )
  }
}
