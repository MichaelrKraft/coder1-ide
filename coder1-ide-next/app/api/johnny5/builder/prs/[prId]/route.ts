/**
 * Johnny5 Builder PR Detail API
 *
 * GET   - Get details for a specific PR
 * PATCH - Update PR status (approve/reject)
 */

import { NextResponse } from 'next/server';
import { MOCK_PENDING_PRS } from '@/services/johnny5/proactive-builder';
import type { Johnny5PRRequest } from '@/types';

interface RouteParams {
  params: Promise<{
    prId: string;
  }>;
}

/**
 * GET /api/johnny5/builder/prs/[prId]
 *
 * Returns details for a specific PR
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { prId } = await params;

    // Find the PR
    const pr = MOCK_PENDING_PRS.find((p) => p.id === prId);

    if (!pr) {
      return NextResponse.json(
        {
          success: false,
          error: `PR not found: ${prId}`,
        },
        { status: 404 }
      );
    }

    // Return PR with additional metadata
    return NextResponse.json({
      success: true,
      data: {
        pr,
        metadata: {
          canApprove: pr.status === 'pending',
          canReject: pr.status === 'pending',
          canMerge: pr.status === 'approved',
          testsPass: pr.testsPass,
          filesCount: pr.files.length,
          linesChanged: pr.linesChanged,
          age: Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / (1000 * 60)), // minutes
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Johnny5 Builder PR GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch PR details',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/johnny5/builder/prs/[prId]
 *
 * Update PR status (approve/reject)
 * Body:
 * - action: 'approve' | 'reject'
 * - reason: (optional) Reason for rejection
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { prId } = await params;
    const body = await request.json();

    // Find the PR
    const prIndex = MOCK_PENDING_PRS.findIndex((p) => p.id === prId);

    if (prIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `PR not found: ${prId}`,
        },
        { status: 404 }
      );
    }

    const pr = MOCK_PENDING_PRS[prIndex];

    // Validate action
    const { action, reason } = body;
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be "approve" or "reject"',
        },
        { status: 400 }
      );
    }

    // Check if PR can be updated
    if (pr.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot ${action} PR with status: ${pr.status}`,
        },
        { status: 400 }
      );
    }

    // Additional check for approval: tests must pass
    if (action === 'approve' && !pr.testsPass) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot approve PR with failing tests',
        },
        { status: 400 }
      );
    }

    // Update PR status (in real implementation, this would persist)
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updatedPR: Johnny5PRRequest = {
      ...pr,
      status: newStatus,
    };

    // Create audit entry
    const auditEntry = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: action === 'approve' ? 'pr_approved' : 'pr_rejected',
      target: pr.title,
      prId: pr.id,
      reason: reason || undefined,
      source: 'user',
    };

    return NextResponse.json({
      success: true,
      data: {
        pr: updatedPR,
        audit: auditEntry,
        message: `PR ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Johnny5 Builder PR PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update PR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/johnny5/builder/prs/[prId]
 *
 * Delete/close a PR (only for rejected PRs)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { prId } = await params;

    // Find the PR
    const pr = MOCK_PENDING_PRS.find((p) => p.id === prId);

    if (!pr) {
      return NextResponse.json(
        {
          success: false,
          error: `PR not found: ${prId}`,
        },
        { status: 404 }
      );
    }

    // Only allow deletion of rejected PRs
    if (pr.status !== 'rejected') {
      return NextResponse.json(
        {
          success: false,
          error: 'Can only delete rejected PRs',
        },
        { status: 400 }
      );
    }

    // In real implementation, this would remove the PR from the database
    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        prId,
        message: 'PR deleted successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Johnny5 Builder PR DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete PR',
      },
      { status: 500 }
    );
  }
}
