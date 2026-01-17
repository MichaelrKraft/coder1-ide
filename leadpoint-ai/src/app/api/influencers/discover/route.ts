/**
 * Influencer Discovery API Endpoint
 * POST /api/influencers/discover
 *
 * Starts a new influencer discovery job using Apify
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  discoverInfluencers,
  runActorAsync,
  isMockMode,
  estimateDiscoveryTime,
} from '@/lib/apify/instagram-discovery'
import { validateUsage, deductUsage } from '@/lib/usage'
import {
  checkDiscoveryRateLimit,
  rateLimitResponse,
} from '@/lib/rate-limit'
import { createApiLogger } from '@/lib/logger'
import {
  logRequest,
  logResponse,
  logRequestError,
  addUserContext,
  type RequestLogContext,
} from '@/lib/logger/request-logger'
import type {
  DiscoveryRequest,
  DiscoverySyncResponse,
  DiscoveryAsyncResponse,
  DiscoveryRunInsert,
  DiscoveredInfluencer,
} from '@/types/discovery'
import type { Platform, SubscriptionPlan } from '@/types/database'

// ============================================================================
// Logger
// ============================================================================

const logger = createApiLogger('influencers/discover')

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_MAX_RESULTS = 500
const MAX_RESULTS_LIMIT = 1000

// ============================================================================
// POST Handler - Start Discovery
// ============================================================================

export async function POST(request: NextRequest) {
  const reqLog = logRequest(request)

  try {
    // Parse request body
    const body = await request.json() as DiscoveryRequest
    const {
      campaign_id,
      hashtags,
      max_results = DEFAULT_MAX_RESULTS,
      platform = 'instagram',
      use_webhook = false,
    } = body

    // Validate required fields
    if (!campaign_id) {
      logger.warn('Missing campaign_id in discovery request')
      const response = NextResponse.json(
        { error: { code: 'MISSING_CAMPAIGN_ID', message: 'campaign_id is required' } },
        { status: 400 }
      )
      return logResponse(reqLog, response)
    }

    if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      logger.warn('Missing or empty hashtags in discovery request')
      const response = NextResponse.json(
        { error: { code: 'MISSING_HASHTAGS', message: 'hashtags array is required and must not be empty' } },
        { status: 400 }
      )
      return logResponse(reqLog, response)
    }

    // Validate max_results
    const validatedMaxResults = Math.min(Math.max(1, max_results), MAX_RESULTS_LIMIT)

    // Validate platform
    const validPlatforms: Platform[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin']
    if (!validPlatforms.includes(platform as Platform)) {
      logger.warn('Invalid platform specified', { platform })
      const response = NextResponse.json(
        { error: { code: 'INVALID_PLATFORM', message: `Platform must be one of: ${validPlatforms.join(', ')}` } },
        { status: 400 }
      )
      return logResponse(reqLog, response)
    }

    logger.debug('Discovery request received', {
      campaignId: campaign_id,
      hashtags: hashtags.slice(0, 5), // Log first 5 hashtags
      hashtagCount: hashtags.length,
      maxResults: validatedMaxResults,
      platform,
      useWebhook: use_webhook,
    })

    // Get authenticated user and organization
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthorized discovery attempt')
      const response = NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
      return logResponse(reqLog, response)
    }

    // Add user context for logging
    addUserContext(reqLog, user.id)

    // Get user's organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      logger.warn('User not in organization', { userId: user.id })
      const response = NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User is not a member of any organization' } },
        { status: 403 }
      )
      return logResponse(reqLog, response)
    }

    const organizationId = member.organization_id
    addUserContext(reqLog, user.id, organizationId)

    // Verify campaign belongs to organization
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('id', campaign_id)
      .eq('organization_id', organizationId)
      .single()

    if (campaignError || !campaign) {
      logger.warn('Campaign not found or access denied', {
        campaignId: campaign_id,
        organizationId,
      })
      const response = NextResponse.json(
        { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found or access denied' } },
        { status: 404 }
      )
      return logResponse(reqLog, response)
    }

    // Get organization subscription plan for rate limiting
    const { data: organization } = await supabase
      .from('organizations')
      .select('subscription_plan')
      .eq('id', organizationId)
      .single()

    const subscriptionPlan: SubscriptionPlan = organization?.subscription_plan || 'free'

    // Check rate limits (use org ID as identifier for consistent team limits)
    const rateLimitResult = checkDiscoveryRateLimit(organizationId, subscriptionPlan)
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for discovery', {
        organizationId,
        plan: subscriptionPlan,
      })
      return logResponse(reqLog, rateLimitResponse(rateLimitResult))
    }

    // Check usage quota
    const usageResult = await validateUsage(organizationId, validatedMaxResults)

    if (!usageResult.allowed) {
      logger.warn('Usage quota exceeded for discovery', {
        organizationId,
        requestedResults: validatedMaxResults,
        message: usageResult.message,
      })
      const response = NextResponse.json(
        {
          error: {
            code: 'QUOTA_EXCEEDED',
            message: usageResult.message,
            quota: usageResult.quota,
          }
        },
        { status: 429 }
      )
      return logResponse(reqLog, response)
    }

    // Async mode with webhook
    if (use_webhook) {
      return handleAsyncDiscovery(
        reqLog,
        supabase,
        organizationId,
        campaign_id,
        hashtags,
        validatedMaxResults,
        platform as Platform,
        user.id
      )
    }

    // Sync mode - run discovery and return results
    return handleSyncDiscovery(
      reqLog,
      supabase,
      organizationId,
      campaign_id,
      hashtags,
      validatedMaxResults,
      platform as Platform,
      user.id
    )

  } catch (error) {
    logRequestError(reqLog, error, { route: 'influencers/discover' })
    const response = NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      },
      { status: 500 }
    )
    return logResponse(reqLog, response)
  }
}

// ============================================================================
// Sync Discovery Handler
// ============================================================================

async function handleSyncDiscovery(
  reqLog: RequestLogContext,
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  campaignId: string,
  hashtags: string[],
  maxResults: number,
  platform: Platform,
  userId: string
): Promise<NextResponse<DiscoverySyncResponse | { error: unknown }>> {
  // Create discovery run record
  const discoveryRun: DiscoveryRunInsert = {
    organization_id: organizationId,
    campaign_id: campaignId,
    hashtags,
    status: 'running',
    actor_run_id: null,
    dataset_id: null,
    results_count: null,
    max_results: maxResults,
    platform,
    started_at: new Date().toISOString(),
    completed_at: null,
    error_message: null,
    created_by: userId,
  }

  const { data: run, error: runError } = await supabase
    .from('discovery_runs')
    .insert(discoveryRun)
    .select()
    .single()

  if (runError) {
    logger.error('Failed to create discovery run', {
      error: runError.message,
      organizationId,
      campaignId,
    })
    // Continue anyway - we can still return results
  }

  const runId = run?.id || `temp_${Date.now()}`

  try {
    const discoveryStartTime = Date.now()

    // Run discovery
    const influencers = await discoverInfluencers(hashtags, maxResults, platform)

    logger.info('Discovery completed', {
      runId,
      discoveredCount: influencers.length,
      durationMs: Date.now() - discoveryStartTime,
      platform,
      hashtagCount: hashtags.length,
      isMock: isMockMode(),
    })

    // Save influencers to database
    const savedInfluencers = await saveInfluencers(
      supabase,
      organizationId,
      campaignId,
      influencers
    )

    logger.info('Influencers saved to database', {
      runId,
      savedCount: savedInfluencers.length,
      campaignId,
    })

    // Update discovery run as completed
    if (run?.id) {
      await supabase
        .from('discovery_runs')
        .update({
          status: 'completed',
          results_count: savedInfluencers.length,
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id)
    }

    // Deduct from usage quota
    await deductUsage(organizationId, savedInfluencers.length, `discovery_${runId}`)

    // Log mock mode warning
    if (isMockMode()) {
      logger.warn('Running in MOCK MODE - results are simulated', { runId })
    }

    const response = NextResponse.json({
      influencers: savedInfluencers,
      total: savedInfluencers.length,
      discovery_run_id: runId,
    })
    return logResponse(reqLog, response)

  } catch (error) {
    // Update discovery run as failed
    if (run?.id) {
      await supabase
        .from('discovery_runs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id)
    }

    logger.error('Discovery failed', {
      runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    throw error
  }
}

// ============================================================================
// Async Discovery Handler
// ============================================================================

async function handleAsyncDiscovery(
  reqLog: RequestLogContext,
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  campaignId: string,
  hashtags: string[],
  maxResults: number,
  platform: Platform,
  userId: string
): Promise<NextResponse<DiscoveryAsyncResponse | { error: unknown }>> {
  // Build webhook URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = `${baseUrl}/api/webhooks/apify`

  try {
    // Start async actor run
    const { actorRunId, estimatedTime } = await runActorAsync(hashtags, maxResults, webhookUrl)

    logger.info('Async discovery started', {
      actorRunId,
      estimatedTime,
      hashtagCount: hashtags.length,
      maxResults,
      platform,
    })

    // Create discovery run record
    const discoveryRun: DiscoveryRunInsert = {
      organization_id: organizationId,
      campaign_id: campaignId,
      hashtags,
      status: 'pending',
      actor_run_id: actorRunId,
      dataset_id: null,
      results_count: null,
      max_results: maxResults,
      platform,
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null,
      created_by: userId,
    }

    const { data: run, error: runError } = await supabase
      .from('discovery_runs')
      .insert(discoveryRun)
      .select()
      .single()

    if (runError) {
      logger.error('Failed to create async discovery run', {
        error: runError.message,
        actorRunId,
        organizationId,
      })
      const response = NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to create discovery job' } },
        { status: 500 }
      )
      return logResponse(reqLog, response)
    }

    // Log mock mode warning
    if (isMockMode()) {
      logger.warn('Running in MOCK MODE - webhook will not be triggered', {
        runId: run.id,
      })
    }

    const response = NextResponse.json({
      job_id: run.id,
      status: 'pending',
      estimated_time: estimatedTime,
    })
    return logResponse(reqLog, response)

  } catch (error) {
    logger.error('Failed to start async discovery', {
      error: error instanceof Error ? error.message : 'Unknown error',
      organizationId,
      campaignId,
    })
    const response = NextResponse.json(
      {
        error: {
          code: 'APIFY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to start discovery job'
        }
      },
      { status: 500 }
    )
    return logResponse(reqLog, response)
  }
}

// ============================================================================
// Save Influencers to Database
// ============================================================================

async function saveInfluencers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  campaignId: string,
  influencers: DiscoveredInfluencer[]
): Promise<DiscoveredInfluencer[]> {
  const savedInfluencers: DiscoveredInfluencer[] = []

  for (const influencer of influencers) {
    try {
      // Check if influencer already exists for this organization
      const { data: existing } = await supabase
        .from('influencers')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('platform', influencer.platform)
        .eq('platform_id', influencer.platform_id)
        .single()

      let influencerId: string

      if (existing) {
        // Update existing influencer
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
        // Insert new influencer
        const { data: newInfluencer, error: insertError } = await supabase
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

        if (insertError) {
          logger.debug('Failed to insert influencer', {
            username: influencer.username,
            error: insertError.message,
          })
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

      savedInfluencers.push(influencer)

    } catch (error) {
      logger.debug('Error saving influencer', {
        username: influencer.username,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      // Continue with other influencers
    }
  }

  return savedInfluencers
}

// ============================================================================
// GET Handler - Get Discovery Status
// ============================================================================

export async function GET(request: NextRequest) {
  const reqLog = logRequest(request, { logQuery: true })

  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')

    if (!jobId) {
      logger.warn('Missing job_id in status request')
      const response = NextResponse.json(
        { error: { code: 'MISSING_JOB_ID', message: 'job_id query parameter is required' } },
        { status: 400 }
      )
      return logResponse(reqLog, response)
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthorized status check')
      const response = NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
      return logResponse(reqLog, response)
    }

    addUserContext(reqLog, user.id)

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      logger.warn('User not in organization', { userId: user.id })
      const response = NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User is not a member of any organization' } },
        { status: 403 }
      )
      return logResponse(reqLog, response)
    }

    addUserContext(reqLog, user.id, member.organization_id)

    // Get discovery run
    const { data: run, error: runError } = await supabase
      .from('discovery_runs')
      .select('*')
      .eq('id', jobId)
      .eq('organization_id', member.organization_id)
      .single()

    if (runError || !run) {
      logger.warn('Discovery job not found', { jobId })
      const response = NextResponse.json(
        { error: { code: 'JOB_NOT_FOUND', message: 'Discovery job not found' } },
        { status: 404 }
      )
      return logResponse(reqLog, response)
    }

    logger.debug('Discovery status retrieved', {
      jobId: run.id,
      status: run.status,
      resultsCount: run.results_count,
    })

    const response = NextResponse.json({
      job_id: run.id,
      status: run.status,
      results_count: run.results_count,
      error_message: run.error_message,
      started_at: run.started_at,
      completed_at: run.completed_at,
      estimated_completion: run.status === 'pending' || run.status === 'running'
        ? new Date(Date.now() + estimateDiscoveryTime(run.max_results) * 1000).toISOString()
        : null,
    })
    return logResponse(reqLog, response)

  } catch (error) {
    logRequestError(reqLog, error, { route: 'influencers/discover/status' })
    const response = NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      },
      { status: 500 }
    )
    return logResponse(reqLog, response)
  }
}
