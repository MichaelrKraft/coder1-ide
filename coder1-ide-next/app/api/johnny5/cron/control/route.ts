/**
 * Johnny5 Cron Service Control API
 *
 * POST /api/johnny5/cron/control - Control the cron service
 *
 * Actions:
 * - start: Start the cron service
 * - stop: Stop the cron service
 * - status: Get service status
 * - init-defaults: Create default jobs (morning brief, trend monitor)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse } from '@/types/johnny5';
import { getCronService } from '@/services/johnny5/cron-service';
import { generateMorningBrief } from '@/services/johnny5/morning-brief-generator';
// Force dynamic rendering
export const dynamic = 'force-dynamic';

type ControlAction = 'start' | 'stop' | 'status' | 'init-defaults' | 'run-morning-brief' | 'run-content-factory' | 'run-quill';

/**
 * POST handler - Control cron service
 *
 * Body: { action: ControlAction }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: ControlAction };

    if (!action) {
      const response: Johnny5APIResponse<null> = {
        success: false,
        error: 'Missing required field: action',
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const cronService = getCronService();
    await cronService.initialize();

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'start': {
        await cronService.start();
        result = {
          status: 'started',
          isRunning: cronService.isRunning(),
          jobCount: cronService.getJobs().length,
        };
        console.log('[Johnny5 Cron Control] Service started');
        break;
      }

      case 'stop': {
        cronService.stop();
        result = {
          status: 'stopped',
          isRunning: cronService.isRunning(),
        };
        console.log('[Johnny5 Cron Control] Service stopped');
        break;
      }

      case 'status': {
        const jobs = cronService.getJobs();
        const enabledJobs = jobs.filter(j => j.enabled);

        result = {
          isRunning: cronService.isRunning(),
          totalJobs: jobs.length,
          enabledJobs: enabledJobs.length,
          jobs: jobs.map(j => ({
            id: j.id,
            name: j.name,
            enabled: j.enabled,
            lastRun: j.lastRun ? new Date(j.lastRun).toISOString() : null,
            nextRun: j.nextRun ? new Date(j.nextRun).toISOString() : null,
          })),
        };
        break;
      }

      case 'init-defaults': {
        await cronService.createDefaultJobs('system');

        // Also start the service if not running
        if (!cronService.isRunning()) {
          await cronService.start();
        }

        const jobs = cronService.getJobs();
        result = {
          status: 'initialized',
          isRunning: cronService.isRunning(),
          jobs: jobs.map(j => ({ id: j.id, name: j.name, enabled: j.enabled })),
        };
        console.log('[Johnny5 Cron Control] Default jobs initialized');
        break;
      }

      case 'run-morning-brief': {
        // Manually trigger morning brief generation (async)
        const brief = await generateMorningBrief(new Date());
        const debugInfo: Record<string, unknown> = {};

        // Push to IDE chat tab
        const io = (global as Record<string, unknown>).io as { emit: (event: string, data: unknown) => void } | undefined;
        debugInfo.ioAvailable = !!io;
        if (io) {
          io.emit('johnny5:morning-brief', {
            type: 'morning_brief_ready',
            briefId: brief.id,
            summary: brief.summary,
            timestamp: new Date().toISOString(),
          });
          io.emit('johnny5:chat-push', {
            id: `brief-${Date.now()}`,
            content: `📋 **Morning Brief**\n\n${brief.summary}`,
            timestamp: new Date().toISOString(),
          });
          debugInfo.socketEmitted = true;
        }

        // Send to Telegram via Bot API HTTP (no bot instance needed)
        try {
          const { getTelegramChatId, getTelegramBotToken } = await import('@/lib/johnny5-config');
          const chatId = getTelegramChatId();
          const token = getTelegramBotToken();
          debugInfo.hasChatId = !!chatId;
          debugInfo.hasToken = !!token;
          if (chatId && token) {
            const text = `📋 *Morning Brief*\n\n${brief.summary}`;
            const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
            });
            const tgData = await tgRes.json() as { ok: boolean; description?: string };
            debugInfo.telegramOk = tgData.ok;
            debugInfo.telegramError = tgData.description;
          }
        } catch (telegramErr) {
          debugInfo.telegramException = String(telegramErr);
        }

        result = {
          status: 'completed',
          briefId: brief.id,
          date: brief.date,
          summary: brief.summary,
          itemCount:
            brief.builtOvernight.length +
            brief.researchCompleted.length +
            brief.trendsSpotted.length +
            brief.needsAttention.length,
        };
        console.log('[Johnny5 Cron Control] Morning brief delivered:', debugInfo);
        break;
      }

      case 'run-content-factory': {
        // Manually trigger Content Factory Scout (async — waits for completion)
        const { runScout } = await import('@/services/johnny5/content-factory/scout-service');
        const scoutResult = await runScout();
        result = {
          status: 'completed',
          storyCount: scoutResult.stories.length,
          runAt: scoutResult.runAt,
          stories: scoutResult.stories.map(s => ({ title: s.title, category: s.category })),
        };
        console.log('[Johnny5 Cron Control] Content Factory Scout completed:', result);
        break;
      }

      case 'run-quill': {
        const { runQuill } = await import('@/services/johnny5/content-factory/quill-service');
        const quillResult = await runQuill();
        result = {
          status: 'completed',
          scriptTitle: quillResult.scriptTitle,
          storyTitle: quillResult.storyTitle,
          estimatedDuration: quillResult.estimatedDuration,
          sectionCount: quillResult.sections.length,
          runAt: quillResult.runAt,
        };
        console.log('[Johnny5 Cron Control] Quill script generation completed:', result);
        break;
      }

      default: {
        const response: Johnny5APIResponse<null> = {
          success: false,
          error: `Unknown action: ${action}. Valid actions: start, stop, status, init-defaults, run-morning-brief, run-content-factory, run-quill`,
          timestamp: new Date(),
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    const response: Johnny5APIResponse<typeof result> = {
      success: true,
      data: result,
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Cron Control] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Cron control action failed',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET handler - Get cron service status
 */
export async function GET() {
  try {
    const cronService = getCronService();
    await cronService.initialize();

    const jobs = cronService.getJobs();
    const enabledJobs = jobs.filter(j => j.enabled);

    const response: Johnny5APIResponse<{
      isRunning: boolean;
      totalJobs: number;
      enabledJobs: number;
      jobs: Array<{
        id: string;
        name: string;
        enabled: boolean;
        lastRun: string | null;
        nextRun: string | null;
        action?: string;
      }>;
    }> = {
      success: true,
      data: {
        isRunning: cronService.isRunning(),
        totalJobs: jobs.length,
        enabledJobs: enabledJobs.length,
        jobs: jobs.map(j => ({
          id: j.id,
          name: j.name,
          enabled: j.enabled,
          lastRun: j.lastRun ? new Date(j.lastRun).toISOString() : null,
          nextRun: j.nextRun ? new Date(j.nextRun).toISOString() : null,
          action: j.payload.action,
        })),
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Cron Control] GET Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cron status',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
