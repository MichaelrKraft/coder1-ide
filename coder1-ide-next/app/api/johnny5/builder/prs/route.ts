/**
 * Johnny5 Builder PRs API
 *
 * GET  - List all pending PRs
 * POST - Create a new build task
 */

import { NextResponse } from 'next/server';
import { MOCK_PENDING_PRS, PROACTIVE_BUILDER_RULES } from '@/services/johnny5/proactive-builder';
import type { Johnny5PRRequest } from '@/types';

/**
 * GET /api/johnny5/builder/prs
 *
 * Returns all PRs created by Johnny5's Proactive Builder
 * Query params:
 * - status: Filter by status (pending, approved, rejected, merged)
 * - limit: Maximum number of PRs to return
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let prs = [...MOCK_PENDING_PRS];

    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected', 'merged'].includes(status)) {
      prs = prs.filter((pr) => pr.status === status);
    }

    // Sort by creation date (newest first)
    prs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply limit
    prs = prs.slice(0, limit);

    // Calculate stats
    const stats = {
      total: MOCK_PENDING_PRS.length,
      pending: MOCK_PENDING_PRS.filter((pr) => pr.status === 'pending').length,
      approved: MOCK_PENDING_PRS.filter((pr) => pr.status === 'approved').length,
      rejected: MOCK_PENDING_PRS.filter((pr) => pr.status === 'rejected').length,
      merged: MOCK_PENDING_PRS.filter((pr) => pr.status === 'merged').length,
      dailyLimit: PROACTIVE_BUILDER_RULES.maxPRsPerDay,
      dailyUsed: MOCK_PENDING_PRS.filter((pr) => {
        const prDate = new Date(pr.createdAt);
        const today = new Date();
        return prDate.toDateString() === today.toDateString();
      }).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        prs,
        stats,
        rules: {
          maxPRsPerDay: PROACTIVE_BUILDER_RULES.maxPRsPerDay,
          maxFilesPerPR: PROACTIVE_BUILDER_RULES.maxFilesPerPR,
          maxLinesChanged: PROACTIVE_BUILDER_RULES.maxLinesChanged,
          requireTestsPass: PROACTIVE_BUILDER_RULES.requireTestsPass,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Johnny5 Builder PRs GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch PRs',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/johnny5/builder/prs
 *
 * Queue a new build task for Johnny5
 * Body:
 * - title: Task title
 * - description: What to build
 * - opportunity: Why this should be built
 * - filesAffected: List of files that will be modified
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const { title, description, opportunity, filesAffected } = body;

    if (!title || !description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: title and description',
        },
        { status: 400 }
      );
    }

    // Check safety rules
    const violations: string[] = [];

    // Check daily limit
    const todayPRs = MOCK_PENDING_PRS.filter((pr) => {
      const prDate = new Date(pr.createdAt);
      const today = new Date();
      return prDate.toDateString() === today.toDateString();
    }).length;

    if (todayPRs >= PROACTIVE_BUILDER_RULES.maxPRsPerDay) {
      violations.push(`Daily PR limit reached (${PROACTIVE_BUILDER_RULES.maxPRsPerDay})`);
    }

    // Check file count
    const files = filesAffected || [];
    if (files.length > PROACTIVE_BUILDER_RULES.maxFilesPerPR) {
      violations.push(`Too many files (max: ${PROACTIVE_BUILDER_RULES.maxFilesPerPR})`);
    }

    // Check for forbidden patterns
    const forbiddenPatterns = ['.env', 'secrets', 'credentials', 'password'];
    for (const file of files) {
      if (forbiddenPatterns.some((pattern) => file.toLowerCase().includes(pattern))) {
        violations.push(`Cannot modify sensitive file: ${file}`);
      }
    }

    if (violations.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Build task violates safety rules',
          violations,
        },
        { status: 400 }
      );
    }

    // Create mock build task (in real implementation, this would queue the task)
    const buildTask = {
      id: `build_${Date.now()}`,
      title,
      description,
      opportunity: opportunity || 'User requested build',
      filesAffected: files,
      createdAt: new Date().toISOString(),
      status: 'pending',
      estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          task: buildTask,
          message: 'Build task queued successfully',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Johnny5 Builder PRs POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create build task',
      },
      { status: 500 }
    );
  }
}
