/**
 * Johnny5 Cron Jobs API
 *
 * GET /api/johnny5/cron - List all cron jobs
 * POST /api/johnny5/cron - Create a new cron job
 *
 * Manages scheduled tasks for proactive AI features like
 * morning briefs and trend monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse } from '@/types/johnny5';
import { getCronService, type CronJob, type CronSchedule, type CronPayload } from '@/services/johnny5/cron-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET handler - List all cron jobs
 */
export async function GET(request: NextRequest) {
  try {
    const cronService = getCronService();
    await cronService.initialize();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'system';

    const jobs = userId === 'all'
      ? cronService.getJobs()
      : cronService.getJobsByUser(userId);

    const response: Johnny5APIResponse<{
      jobs: CronJob[];
      isRunning: boolean;
      count: number;
    }> = {
      success: true,
      data: {
        jobs,
        isRunning: cronService.isRunning(),
        count: jobs.length,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Cron API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cron jobs',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST handler - Create a new cron job
 *
 * Body: {
 *   name: string;
 *   schedule: CronSchedule;
 *   payload: CronPayload;
 *   userId?: string;
 *   enabled?: boolean;
 *   deleteAfterRun?: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, schedule, payload, userId = 'system', enabled = true, deleteAfterRun = false } = body;

    // Validate required fields
    if (!name || !schedule || !payload) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Missing required fields: name, schedule, payload',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate schedule
    if (!schedule.kind || !['at', 'every', 'cron'].includes(schedule.kind)) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Invalid schedule kind. Must be "at", "every", or "cron"',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const cronService = getCronService();
    const result = await cronService.addJob(
      name,
      schedule as CronSchedule,
      payload as CronPayload,
      userId,
      { enabled, deleteAfterRun }
    );

    if (!result.success) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: result.error || 'Failed to create job',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log(`[Johnny5 Cron API] Created job: ${result.job?.name}`);

    const response: Johnny5APIResponse<{ job: CronJob }> = {
      success: true,
      data: { job: result.job! },
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('[Johnny5 Cron API] POST Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create cron job',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
