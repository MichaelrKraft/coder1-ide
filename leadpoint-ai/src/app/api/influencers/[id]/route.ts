/**
 * Single Influencer API Endpoint
 * GET /api/influencers/:id - Get influencer details
 * PATCH /api/influencers/:id - Update influencer
 * DELETE /api/influencers/:id - Remove influencer from campaign
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Influencer } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

interface InfluencerDetailResponse {
  data: Influencer & {
    campaigns?: Array<{
      id: string
      name: string
      stage: string
      score: number | null
    }>
    outreach_count?: number
    content_count?: number
  }
}

interface UpdateInfluencerRequest {
  notes?: string
  tags?: string[]
  email?: string
  contact_info?: Record<string, unknown>
  categories?: string[]
  // Campaign-specific updates
  campaign_id?: string
  stage?: string
  score?: {
    overall: number
    relevance: number
    engagement: number
    authenticity: number
    brand_fit: number
    value_score: number
    reasoning?: string
  }
}

interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// ============================================================================
// GET Handler - Get Influencer Details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<InfluencerDetailResponse | ErrorResponse>> {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: { code: 'MISSING_ID', message: 'Influencer ID is required' } },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User is not a member of any organization' } },
        { status: 403 }
      )
    }

    const organizationId = member.organization_id

    // Get influencer with organization check
    const { data: influencer, error: influencerError } = await supabase
      .from('influencers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (influencerError || !influencer) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Influencer not found or access denied' } },
        { status: 404 }
      )
    }

    // Get campaigns this influencer is part of
    const { data: campaignInfluencers } = await supabase
      .from('campaign_influencers')
      .select(`
        campaign_id,
        stage,
        score,
        campaigns (
          id,
          name
        )
      `)
      .eq('influencer_id', id)

    const campaigns = campaignInfluencers?.map(ci => ({
      id: ci.campaign_id,
      name: (ci.campaigns as unknown as { name: string })?.name || 'Unknown',
      stage: ci.stage,
      score: ci.score?.overall ?? null,
    })) || []

    // Get outreach count
    const { count: outreachCount } = await supabase
      .from('outreach_messages')
      .select('id', { count: 'exact', head: true })
      .in(
        'campaign_influencer_id',
        campaignInfluencers?.map(ci => ci.campaign_id) || []
      )

    // Get content count
    const { count: contentCount } = await supabase
      .from('content_posts')
      .select('id', { count: 'exact', head: true })
      .in(
        'campaign_influencer_id',
        campaignInfluencers?.map(ci => ci.campaign_id) || []
      )

    return NextResponse.json({
      data: {
        ...influencer,
        campaigns,
        outreach_count: outreachCount || 0,
        content_count: contentCount || 0,
      },
    })

  } catch (error) {
    console.error('[Influencer API] GET error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH Handler - Update Influencer
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await request.json() as UpdateInfluencerRequest

    if (!id) {
      return NextResponse.json(
        { error: { code: 'MISSING_ID', message: 'Influencer ID is required' } },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User is not a member of any organization' } },
        { status: 403 }
      )
    }

    const organizationId = member.organization_id

    // Verify influencer exists and belongs to organization
    const { data: influencer, error: influencerError } = await supabase
      .from('influencers')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (influencerError || !influencer) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Influencer not found or access denied' } },
        { status: 404 }
      )
    }

    // Build update object for influencer table
    const influencerUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.email !== undefined) {
      influencerUpdate.email = body.email
    }

    if (body.contact_info !== undefined) {
      influencerUpdate.contact_info = body.contact_info
    }

    if (body.categories !== undefined) {
      influencerUpdate.categories = body.categories
    }

    // Update influencer if there are changes
    if (Object.keys(influencerUpdate).length > 1) {
      const { error: updateError } = await supabase
        .from('influencers')
        .update(influencerUpdate)
        .eq('id', id)

      if (updateError) {
        console.error('[Influencer API] Update error:', updateError)
        return NextResponse.json(
          {
            error: {
              code: 'UPDATE_ERROR',
              message: 'Failed to update influencer',
              details: { message: updateError.message },
            },
          },
          { status: 500 }
        )
      }
    }

    // Update campaign-specific data if campaign_id is provided
    if (body.campaign_id) {
      const { data: campaignInfluencer } = await supabase
        .from('campaign_influencers')
        .select('id')
        .eq('campaign_id', body.campaign_id)
        .eq('influencer_id', id)
        .single()

      if (campaignInfluencer) {
        const campaignUpdate: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        }

        if (body.notes !== undefined) {
          campaignUpdate.notes = body.notes
        }

        if (body.stage !== undefined) {
          campaignUpdate.stage = body.stage
          campaignUpdate.stage_changed_at = new Date().toISOString()
        }

        if (body.score !== undefined) {
          campaignUpdate.score = body.score
        }

        await supabase
          .from('campaign_influencers')
          .update(campaignUpdate)
          .eq('id', campaignInfluencer.id)
      }
    }

    // Fetch and return updated influencer
    const { data: updatedInfluencer } = await supabase
      .from('influencers')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({
      data: updatedInfluencer,
      message: 'Influencer updated successfully',
    })

  } catch (error) {
    console.error('[Influencer API] PATCH error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE Handler - Remove Influencer
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')
    const hardDelete = searchParams.get('hard_delete') === 'true'

    if (!id) {
      return NextResponse.json(
        { error: { code: 'MISSING_ID', message: 'Influencer ID is required' } },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get user's organization and role
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User is not a member of any organization' } },
        { status: 403 }
      )
    }

    const organizationId = member.organization_id

    // Verify influencer exists and belongs to organization
    const { data: influencer, error: influencerError } = await supabase
      .from('influencers')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (influencerError || !influencer) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Influencer not found or access denied' } },
        { status: 404 }
      )
    }

    // If campaign_id is provided, just remove from that campaign
    if (campaignId) {
      const { error: deleteError } = await supabase
        .from('campaign_influencers')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('influencer_id', id)

      if (deleteError) {
        console.error('[Influencer API] Delete from campaign error:', deleteError)
        return NextResponse.json(
          {
            error: {
              code: 'DELETE_ERROR',
              message: 'Failed to remove influencer from campaign',
            },
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Influencer removed from campaign successfully',
        influencer_id: id,
        campaign_id: campaignId,
      })
    }

    // Hard delete requires admin/owner role
    if (hardDelete) {
      if (member.role !== 'owner' && member.role !== 'admin') {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Only admins and owners can permanently delete influencers',
            },
          },
          { status: 403 }
        )
      }

      // Delete from all campaigns first (cascade would handle this in a real DB)
      await supabase
        .from('campaign_influencers')
        .delete()
        .eq('influencer_id', id)

      // Delete the influencer
      const { error: deleteError } = await supabase
        .from('influencers')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('[Influencer API] Hard delete error:', deleteError)
        return NextResponse.json(
          {
            error: {
              code: 'DELETE_ERROR',
              message: 'Failed to delete influencer',
            },
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Influencer permanently deleted',
        influencer_id: id,
      })
    }

    // Soft delete - remove from all campaigns
    const { error: deleteError } = await supabase
      .from('campaign_influencers')
      .delete()
      .eq('influencer_id', id)

    if (deleteError) {
      console.error('[Influencer API] Soft delete error:', deleteError)
      return NextResponse.json(
        {
          error: {
            code: 'DELETE_ERROR',
            message: 'Failed to remove influencer from campaigns',
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Influencer removed from all campaigns',
      influencer_id: id,
    })

  } catch (error) {
    console.error('[Influencer API] DELETE error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
