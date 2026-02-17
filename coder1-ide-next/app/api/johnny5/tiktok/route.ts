/**
 * Johnny5 TikTok Content API
 *
 * POST /api/johnny5/tiktok - Trigger async slideshow generation
 * GET  /api/johnny5/tiktok?taskId=xxx - Check generation status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTikTokContentService, buildSlideshowConfig } from '@/services/johnny5/tiktok-content-service';
import { createTask, getTaskById, updateTaskStatus } from '@/services/johnny5/task-tracker';
import { logger } from '@/lib/logger';

// ============================================================================
// POST - Trigger slideshow generation
// ============================================================================

export async function POST(request: NextRequest) {
  // 1. Check feature flag
  if (process.env.JOHNNY5_TIKTOK_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'TikTok content generation is disabled. Set JOHNNY5_TIKTOK_ENABLED=true to enable.' },
      { status: 403 }
    );
  }

  // 2. Parse and validate request
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.hook || typeof body.hook !== 'string') {
    return NextResponse.json({ error: 'Missing required field: hook (string)' }, { status: 400 });
  }

  const config = buildSlideshowConfig(body as {
    hook: string;
    basePrompt?: string;
    slides?: { styleOverride: string; overlayText?: string }[];
    app?: string;
    hashtags?: string[];
    captionContext?: string;
    quality?: 'low' | 'medium' | 'high';
    dryRun?: boolean;
  });

  // 3. Create Mission Control task
  let taskId: string | undefined;
  try {
    const task = await createTask({
      title: `TikTok: "${config.hook.substring(0, 60)}${config.hook.length > 60 ? '...' : ''}"`,
      description: `Generate ${config.slides.length}-slide carousel for ${config.app}`,
      type: 'build',
      priority: 'medium',
      triggeredBy: (body.triggeredBy as 'user' | 'schedule' | 'conversation') || 'user',
    });
    taskId = task.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[TikTok API] Task creation failed (non-fatal): ${msg}`);
  }

  // 4. Run generation async (fire-and-forget with error capture)
  const service = getTikTokContentService();
  generateAsync(service, config, taskId).catch(err => {
    logger.error(`[TikTok API] Async generation failed: ${err.message}`);
  });

  // 5. Return immediately
  return NextResponse.json({
    success: true,
    taskId,
    message: 'Slideshow generation started. You will be notified via Telegram when ready.',
    config: {
      hook: config.hook,
      app: config.app,
      quality: config.quality,
      slideCount: config.slides.length,
      dryRun: config.dryRun,
    },
  });
}

// ============================================================================
// GET - Check generation status
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'Missing query parameter: taskId' }, { status: 400 });
  }

  try {
    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      taskId: task.id,
      title: task.title,
      status: task.status,
      result: task.result,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ============================================================================
// Async Generation Runner
// ============================================================================

async function generateAsync(
  service: ReturnType<typeof getTikTokContentService>,
  config: ReturnType<typeof buildSlideshowConfig>,
  taskId?: string
): Promise<void> {
  // Update task to in-progress
  if (taskId) {
    try {
      await updateTaskStatus(taskId, 'in_progress');
    } catch {
      // non-fatal
    }
  }

  try {
    const result = await service.generateSlideshow(config);

    // Update task with result
    if (taskId) {
      try {
        await updateTaskStatus(
          taskId,
          result.success ? 'completed' : 'failed',
          {
            success: result.success,
            postId: result.postId,
            imageCount: result.imageCount,
            cost: result.cost,
            localPaths: result.localPaths,
            error: result.error,
          }
        );
      } catch {
        // non-fatal
      }
    }

    // Send Telegram notification
    try {
      await sendTikTokNotification(result, config.hook, taskId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[TikTok API] Telegram notification failed: ${msg}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[TikTok API] Generation failed: ${msg}`);

    if (taskId) {
      try {
        await updateTaskStatus(taskId, 'failed', { error: msg });
      } catch {
        // non-fatal
      }
    }

    // Notify failure via Telegram
    try {
      await sendTikTokErrorNotification(msg, config.hook);
    } catch {
      // last-resort logging
      logger.error('[TikTok API] Failed to send error notification');
    }
  }
}

// ============================================================================
// Telegram Notification Helpers
// ============================================================================

async function sendTikTokNotification(
  result: Awaited<ReturnType<ReturnType<typeof getTikTokContentService>['generateSlideshow']>>,
  hook: string,
  taskId?: string
): Promise<void> {
  // Dynamic import to avoid circular dependency
  const { telegramBot } = await import('@/services/johnny5/telegram-bot');
  const { getJohnny5Config } = await import('@/lib/johnny5-config');

  const bot = telegramBot;
  const config = getJohnny5Config();
  const chatId = config.integrations.telegram?.chatId;

  if (!chatId) {
    logger.warn('[TikTok API] No Telegram chatId configured, skipping notification');
    return;
  }

  if (result.success) {
    const message = [
      `*TikTok Content Ready*`,
      '',
      `Hook: "${hook.substring(0, 100)}"`,
      '',
      `Caption (copy & paste):`,
      '---',
      result.caption,
      '---',
      '',
      `Slides: ${result.imageCount} | Cost: $${result.cost.toFixed(2)}`,
      result.postId ? `Draft ID: ${result.postId}` : `Files: ${result.localPaths[0]?.replace(/\/slide-0\.png$/, '/')}`,
      result.error ? `\nWarnings: ${result.error}` : '',
    ].filter(Boolean).join('\n');

    await bot.notifyAction(chatId, 'TikTok Content Ready', message, 'success');
  } else {
    await sendTikTokErrorNotification(result.error || 'Unknown error', hook);
  }
}

async function sendTikTokErrorNotification(error: string, hook: string): Promise<void> {
  const { telegramBot } = await import('@/services/johnny5/telegram-bot');
  const { getJohnny5Config } = await import('@/lib/johnny5-config');

  const bot = telegramBot;
  const config = getJohnny5Config();
  const chatId = config.integrations.telegram?.chatId;

  if (!chatId) return;

  const message = [
    `Hook: "${hook.substring(0, 100)}"`,
    '',
    `Error: ${error}`,
  ].join('\n');

  await bot.notifyAction(chatId, 'TikTok Generation Failed', message, 'failure');
}
