/**
 * Apify Webhook Handler
 * POST /api/webhooks/apify
 *
 * Called by Apify when an actor run completes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDiscoveryResults, isMockMode } from '@/lib/apify/instagram-discovery'
import { deductUsage } from '@/lib/usage'
import type { ApifyWebhookPayload, DiscoveredInfluencer } from '@/types/discovery'

// ============================================================================
// Configuration
// ============================================================================

// Optional: Apify webhook signature validation
// Set APIFY_WEBHOOK_SECRET in your environment if you want to verify webhooks
const WEBHOOK_SECRET = process.env.APIFY_WEBHOOK_SECRET

// ============================================================================
// POST Handler - Webhook Receiver
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Log incoming webhook
    console.log('[Apify Webhook] Received webhook')

    // Parse request body
    const body = await request.json() as ApifyWebhookPayload

    // Validate webhook structure
    if (!body.eventType || !body.eventData || !body.resource) {
      console.error('[Apify Webhook] Invalid webhook payload:', body)
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    // Optional: Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-apify-webhook-signature')
      if (!verifySignature(body, signature)) {
        console.error('[Apify Webhook] Invalid signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const { eventType, eventData, resource } = body
    const actorRunId = eventData.actorRunId || resource.id

    console.log(`[Apify Webhook] Event: ${eventType}, Run ID: ${actorRunId}`)

    // Handle different event types
    switch (eventType) {
      case 'ACTOR.RUN.SUCCEEDED':
        return handleSuccess(actorRunId, eventData.defaultDatasetId)

      case 'ACTOR.RUN.FAILED':
      case 'ACTOR.RUN.ABORTED':
      case 'ACTOR.RUN.TIMED_OUT':
        return handleFailure(actorRunId, eventType)

      default:
        console.warn(`[Apify Webhook] Unknown event type: ${eventType}`)
        return NextResponse.json({ status: 'ignored', eventType })
    }

  } catch (error) {
    console.error('[Apify Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Handle Successful Run
// ============================================================================

async function handleSuccess(
  actorRunId: string,
  datasetId: string
): Promise<NextResponse> {
  const supabase = await createClient()

  // Find the discovery run by actor_run_id
  const { data: discoveryRun, error: findError } = await supabase
    .from('discovery_runs')
    .select('*')
    .eq('actor_run_id', actorRunId)
    .single()

  if (findError || !discoveryRun) {
    console.error(`[Apify Webhook] Discovery run not found for actor_run_id: ${actorRunId}`)
    // Return 200 anyway to prevent Apify from retrying
    return NextResponse.json({
      status: 'warning',
      message: 'Discovery run not found',
      actor_run_id: actorRunId,
    })
  }

  console.log(`[Apify Webhook] Processing results for discovery run: ${discoveryRun.id}`)

  try {
    // Update status to running
    await supabase
      .from('discovery_runs')
      .update({
        status: 'running',
        dataset_id: datasetId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', discoveryRun.id)

    // Fetch results from Apify dataset
    const influencers = await getDiscoveryResults(datasetId)

    // Save influencers to database
    const savedCount = await saveInfluencersFromWebhook(
      supabase,
      discoveryRun.organization_id,
      discoveryRun.campaign_id,
      influencers
    )

    // Update discovery run as completed
    await supabase
      .from('discovery_runs')
      .update({
        status: 'completed',
        results_count: savedCount,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', discoveryRun.id)

    // Deduct from usage quota
    await deductUsage(
      discoveryRun.organization_id,
      savedCount,
      `discovery_${discoveryRun.id}`
    )

    // Optional: Send notification
    await sendCompletionNotification(discoveryRun.id, savedCount, 'success')

    console.log(`[Apify Webhook] Successfully processed ${savedCount} influencers`)

    return NextResponse.json({
      status: 'success',
      discovery_run_id: discoveryRun.id,
      results_count: savedCount,
    })

  } catch (error) {
    console.error('[Apify Webhook] Error processing results:', error)

    // Update discovery run as failed
    await supabase
      .from('discovery_runs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Failed to process results',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', discoveryRun.id)

    return NextResponse.json({
      status: 'error',
      message: 'Failed to process results',
      discovery_run_id: discoveryRun.id,
    })
  }
}

// ============================================================================
// Handle Failed Run
// ============================================================================

async function handleFailure(
  actorRunId: string,
  eventType: string
): Promise<NextResponse> {
  const supabase = await createClient()

  // Find the discovery run
  const { data: discoveryRun } = await supabase
    .from('discovery_runs')
    .select('id, organization_id')
    .eq('actor_run_id', actorRunId)
    .single()

  if (!discoveryRun) {
    console.error(`[Apify Webhook] Discovery run not found for failed actor_run_id: ${actorRunId}`)
    return NextResponse.json({
      status: 'warning',
      message: 'Discovery run not found',
      actor_run_id: actorRunId,
    })
  }

  // Determine error message based on event type
  const errorMessages: Record<string, string> = {
    'ACTOR.RUN.FAILED': 'Actor run failed - check Apify logs for details',
    'ACTOR.RUN.ABORTED': 'Actor run was aborted',
    'ACTOR.RUN.TIMED_OUT': 'Actor run timed out - try reducing max_results',
  }

  const errorMessage = errorMessages[eventType] || `Unknown error: ${eventType}`

  // Update discovery run as failed
  await supabase
    .from('discovery_runs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', discoveryRun.id)

  // Send failure notification
  await sendCompletionNotification(discoveryRun.id, 0, 'failed', errorMessage)

  console.log(`[Apify Webhook] Marked discovery run ${discoveryRun.id} as failed: ${errorMessage}`)

  return NextResponse.json({
    status: 'failed',
    discovery_run_id: discoveryRun.id,
    error: errorMessage,
  })
}

// ============================================================================
// Save Influencers from Webhook
// ============================================================================

async function saveInfluencersFromWebhook(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  campaignId: string,
  influencers: DiscoveredInfluencer[]
): Promise<number> {
  let savedCount = 0

  for (const influencer of influencers) {
    try {
      // Check if influencer already exists
      const { data: existing } = await supabase
        .from('influencers')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('platform', influencer.platform)
        .eq('platform_id', influencer.platform_id)
        .single()

      let influencerId: string

      if (existing) {
        // Update existing
        influencerId = existing.id

        await supabase
          .from('influencers')
          .update({
            username: influencer.username,
            display_name: influencer.display_name,
            avatar_url: influencer.avatar_url,
            bio: influencer.bio,
            follower_count: influencer.follower_count || 0,
            following_count: influencer.following_count || 0,
            engagement_rate: influencer.engagement_rate,
            average_likes: influencer.average_likes,
            average_comments: influencer.average_comments,
            average_views: influencer.average_views,
            categories: influencer.categories,
            location: influencer.location,
            language: influencer.language,
            email: influencer.email,
            metrics_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

      } else {
        // Insert new
        const { data: newInfluencer, error } = await supabase
          .from('influencers')
          .insert({
            organization_id: organizationId,
            platform: influencer.platform,
            platform_id: influencer.platform_id,
            username: influencer.username,
            display_name: influencer.display_name,
            profile_url: influencer.profile_url,
            avatar_url: influencer.avatar_url,
            bio: influencer.bio,
            follower_count: influencer.follower_count || 0,
            following_count: influencer.following_count || 0,
            engagement_rate: influencer.engagement_rate,
            average_likes: influencer.average_likes,
            average_comments: influencer.average_comments,
            average_views: influencer.average_views,
            categories: influencer.categories,
            location: influencer.location,
            language: influencer.language,
            email: influencer.email,
            metrics_updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (error || !newInfluencer) {
          console.error('[Apify Webhook] Failed to insert influencer:', error)
          continue
        }

        influencerId = newInfluencer.id
      }

      // Link to campaign if not already linked
      const { data: existingLink } = await supabase
        .from('campaign_influencers')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('influencer_id', influencerId)
        .single()

      if (!existingLink) {
        await supabase
          .from('campaign_influencers')
          .insert({
            campaign_id: campaignId,
            influencer_id: influencerId,
            stage: 'discovered',
            added_by: 'system',
            stage_changed_at: new Date().toISOString(),
          })
      }

      savedCount++

    } catch (error) {
      console.error('[Apify Webhook] Error saving influencer:', error)
    }
  }

  return savedCount
}

// ============================================================================
// Send Completion Notification
// ============================================================================

async function sendCompletionNotification(
  discoveryRunId: string,
  resultsCount: number,
  status: 'success' | 'failed',
  errorMessage?: string
): Promise<void> {
  // TODO: Implement notification system
  // Options:
  // 1. Email via SendGrid/Resend
  // 2. In-app notification via database
  // 3. WebSocket push notification
  // 4. Slack webhook

  console.log(`[Notification] Discovery ${discoveryRunId}: ${status}`, {
    resultsCount,
    errorMessage,
  })

  // For now, just log the notification
  // Future implementation might look like:
  // await sendEmail({
  //   to: userEmail,
  //   subject: `Discovery Complete: ${resultsCount} influencers found`,
  //   body: `Your influencer discovery has completed. Found ${resultsCount} influencers.`,
  // })
}

// ============================================================================
// Verify Webhook Signature
// ============================================================================

function verifySignature(
  payload: ApifyWebhookPayload,
  signature: string | null
): boolean {
  if (!WEBHOOK_SECRET || !signature) {
    return !WEBHOOK_SECRET // Only fail if secret is configured but signature is missing
  }

  // Apify uses HMAC-SHA256 for webhook signatures
  // Implementation depends on Apify's exact signature format
  // For now, we'll do a simple check

  try {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex')

    return signature === expectedSignature
  } catch {
    console.error('[Apify Webhook] Signature verification failed')
    return false
  }
}

// ============================================================================
// GET Handler - Health Check
// ============================================================================

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'apify-webhook',
    mock_mode: isMockMode(),
    timestamp: new Date().toISOString(),
  })
}
