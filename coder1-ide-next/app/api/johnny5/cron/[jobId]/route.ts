/**
 * Johnny5 Cron Job Management API
 *
 * GET /api/johnny5/cron/[jobId] - Get job details and history
 * PATCH /api/johnny5/cron/[jobId] - Enable/disable job
 * DELETE /api/johnny5/cron/[jobId] - Remove job
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse } from '@/types/johnny5';
import { getCronService, type CronJob, type CronRunRecord } from '@/services/johnny5/cron-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * GET handler - Get job details and run history
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const cronService = getCronService();
    await cronService.initialize();

    const job = cronService.getJob(jobId);
    if (!job) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: `Job not found: ${jobId}`,
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 404 });
    }

    const history = await cronService.getJobHistory(jobId);

    const response: Johnny5APIResponse<{
      job: CronJob;
      history: CronRunRecord[];
      formattedInfo: string;
    }> = {
      success: true,
      data: {
        job,
        history,
        formattedInfo: cronService.formatJobInfo(job),
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Cron API] GET Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch job',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PATCH handler - Enable or disable a job
 *
 * Body: { enabled: boolean }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Missing or invalid "enabled" field (must be boolean)',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const cronService = getCronService();
    await cronService.initialize();

    const job = cronService.getJob(jobId);
    if (!job) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: `Job not found: ${jobId}`,
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 404 });
    }

    let success: boolean;
    if (enabled) {
      success = await cronService.enableJob(jobId);
    } else {
      success = await cronService.disableJob(jobId);
    }

    if (!success) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Failed to update job',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 500 });
    }

    const updatedJob = cronService.getJob(jobId);

    console.log(`[Johnny5 Cron API] Job ${jobId} ${enabled ? 'enabled' : 'disabled'}`);

    const response: Johnny5APIResponse<{ job: CronJob | undefined }> = {
      success: true,
      data: { job: updatedJob },
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Cron API] PATCH Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update job',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE handler - Remove a cron job
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const cronService = getCronService();
    await cronService.initialize();

    const job = cronService.getJob(jobId);
    if (!job) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: `Job not found: ${jobId}`,
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 404 });
    }

    const success = await cronService.removeJob(jobId);

    if (!success) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Failed to remove job',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 500 });
    }

    console.log(`[Johnny5 Cron API] Removed job: ${job.name} (${jobId})`);

    const response: Johnny5APIResponse<{ removed: boolean; jobName: string }> = {
      success: true,
      data: { removed: true, jobName: job.name },
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Cron API] DELETE Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove job',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
