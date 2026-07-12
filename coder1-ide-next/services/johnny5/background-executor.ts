/**
 * Johnny5 Background Executor
 *
 * Polls TaskTracker for queued tasks and executes them:
 * - research/monitor/trend tasks → Gemini API (no Bridge needed)
 * - build/fix/create_pr tasks → BridgeManager (requires connected Bridge)
 *
 * Features:
 * - 30s polling interval
 * - Max 2 concurrent tasks
 * - Retry with exponential backoff
 * - Scheduled execution (scheduledAt)
 * - Delivery scheduling (deliverAt)
 * - Socket.IO + Telegram notifications
 */

import { TaskTracker } from './task-tracker';
import { SecurityTracker, logAuditEntry } from '@/services/johnny5/security-tracker';
import { getDb } from '@/lib/johnny5-db';
import { randomUUID } from 'crypto';
import type { Johnny5Task } from '@/types/johnny5';

// ============================================================================
// Types
// ============================================================================

interface ExecutorConfig {
  pollIntervalMs: number;
  maxConcurrent: number;
  defaultTimeoutMs: number;
}

interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
  tokensUsed: number;
}

// ============================================================================
// Permission Gate
// ============================================================================

function isTaskPermitted(task: Johnny5Task): { permitted: boolean; reason?: string } {
  const permissions = SecurityTracker.getDefaultPermissions();
  const perm = permissions.find(p => p.type === (task.type as string));
  if (perm?.status === 'blocked') {
    return { permitted: false, reason: `Permission '${task.type}' is blocked` };
  }
  return { permitted: true };
}

// ============================================================================
// BackgroundExecutor
// ============================================================================

class BackgroundExecutor {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private activeTasks = new Map<string, AbortController>();
  private io: any = null;
  private bridgeManager: any = null;
  private config: ExecutorConfig;
  private isPolling = false;

  constructor(config?: Partial<ExecutorConfig>) {
    this.config = {
      pollIntervalMs: 30_000,
      maxConcurrent: 2,
      defaultTimeoutMs: 1_800_000, // 30 minutes
      ...config,
    };
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(io: any, bridgeManager?: any): void {
    this.io = io;
    this.bridgeManager = bridgeManager;

    // Recover stuck tasks from previous crash
    this.recoverStuckTasks();

    // Start polling
    this.pollTimer = setInterval(() => this.poll(), this.config.pollIntervalMs);
    console.log(`[BackgroundExecutor] Started (poll: ${this.config.pollIntervalMs / 1000}s, max: ${this.config.maxConcurrent} concurrent)`);

    // Run first poll immediately
    this.poll();
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // Cancel active tasks and re-queue them
    for (const [taskId, controller] of this.activeTasks) {
      controller.abort();
      TaskTracker.updateTaskStatus(taskId, 'queued').catch(() => {});
    }
    this.activeTasks.clear();
    console.log('[BackgroundExecutor] Stopped');
  }

  // --------------------------------------------------------------------------
  // Polling
  // --------------------------------------------------------------------------

  private async poll(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // Check capacity
      if (this.activeTasks.size >= this.config.maxConcurrent) return;

      // Get queued tasks
      const tasks = await TaskTracker.getTasks({ status: 'queued', limit: 5 });

      for (const task of tasks) {
        if (this.activeTasks.size >= this.config.maxConcurrent) break;

        // Check scheduledAt — skip if scheduled for the future
        if (task.scheduledAt && task.scheduledAt.getTime() > Date.now()) {
          continue;
        }

        // Check if task type is permitted before executing
        const check = isTaskPermitted(task);
        if (!check.permitted) {
          await logAuditEntry({
            action: 'blocked',
            target: task.id,
            source: 'ai',
            risk: 'medium',
            blocked: true,
            blockReason: check.reason,
          });
          await TaskTracker.updateTaskStatus(task.id, 'failed');
          console.warn(`[BackgroundExecutor] Task ${task.id.slice(0, 8)} blocked: ${check.reason}`);
          continue;
        }

        // Execute the task
        this.executeTask(task);
      }

      // Check for completed tasks pending delivery
      await this.checkPendingDeliveries();
    } catch (err) {
      console.error('[BackgroundExecutor] Poll error:', err);
    } finally {
      this.isPolling = false;
    }
  }

  // --------------------------------------------------------------------------
  // Task Execution
  // --------------------------------------------------------------------------

  private async executeTask(task: Johnny5Task): Promise<void> {
    const controller = new AbortController();
    this.activeTasks.set(task.id, controller);

    // Mark as in_progress
    await TaskTracker.updateTaskStatus(task.id, 'in_progress');

    try {
      // Set timeout
      const timeout = setTimeout(() => controller.abort(), this.config.defaultTimeoutMs);

      const result = await this.routeExecution(task, controller.signal);

      clearTimeout(timeout);

      // Update task with result
      await TaskTracker.updateTaskStatus(task.id, 'completed', {
        summary: result.output?.slice(0, 2000),
      });

      console.log(`[BackgroundExecutor] Task ${task.id.slice(0, 8)} completed: ${task.title}`);

      // Deliver result (or schedule delivery)
      await this.deliverResult(task, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isAbort = message.includes('aborted') || message.includes('abort');

      console.error(`[BackgroundExecutor] Task ${task.id.slice(0, 8)} failed: ${message}`);

      // Update retry count via direct DB access
      const retryCount = (task.retryCount ?? 0) + 1;
      const maxRetries = task.maxRetries ?? 2;

      try {
        const db = getDb();
        db.prepare('UPDATE tasks SET retry_count = ?, last_error = ? WHERE id = ?')
          .run(retryCount, message.slice(0, 500), task.id);
      } catch {
        // Non-fatal
      }

      if (retryCount <= maxRetries && !isAbort) {
        // Re-queue for retry
        await TaskTracker.updateTaskStatus(task.id, 'queued');
      } else {
        // Mark as failed
        await TaskTracker.updateTaskStatus(task.id, 'failed', {
          error: message.slice(0, 500),
        });

        // Notify user of failure
        await this.deliverResult(task, { success: false, error: message, tokensUsed: 0 });
      }
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  // --------------------------------------------------------------------------
  // Routing
  // --------------------------------------------------------------------------

  private async routeExecution(task: Johnny5Task, signal: AbortSignal): Promise<TaskResult> {
    const taskType = task.type;

    // Research/monitor/trend → Gemini API (no Bridge needed)
    if (['research', 'monitor', 'trend', 'skill'].includes(taskType)) {
      return this.executeViaGemini(task, signal);
    }

    // Build/fix/create_pr → Bridge (requires connection)
    if (['build', 'fix', 'create_pr'].includes(taskType)) {
      return this.executeViaBridge(task);
    }

    // Fallback: try Gemini for anything else
    return this.executeViaGemini(task, signal);
  }

  // --------------------------------------------------------------------------
  // Gemini API Execution
  // --------------------------------------------------------------------------

  private async executeViaGemini(task: Johnny5Task, signal: AbortSignal): Promise<TaskResult> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'GEMINI_API_KEY not configured', tokensUsed: 0 };
    }

    const prompt = this.buildTaskPrompt(task);

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are Johnny5, an autonomous AI research assistant. Provide thorough, actionable results.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
        signal,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || 'No output';
    const tokensUsed = data.usage?.total_tokens || 0;

    return { success: true, output, tokensUsed };
  }

  private buildTaskPrompt(task: Johnny5Task): string {
    const parts = [
      `Task: ${task.title}`,
      task.description ? `Details: ${task.description}` : '',
      `Type: ${task.type}`,
      `Priority: ${task.priority}`,
      '',
      'Provide a thorough research report with key findings, data points, and actionable recommendations.',
      'Format your response with clear sections and bullet points.',
    ];
    return parts.filter(Boolean).join('\n');
  }

  // --------------------------------------------------------------------------
  // Bridge Execution (for build/fix tasks)
  // --------------------------------------------------------------------------

  private async executeViaBridge(task: Johnny5Task): Promise<TaskResult> {
    if (!this.bridgeManager) {
      return { success: false, error: 'Bridge not available — build tasks require a connected Bridge', tokensUsed: 0 };
    }

    // Check if any bridge is connected
    const anyBridge = this.bridgeManager.findAnyConnectedBridge?.();
    if (!anyBridge) {
      return { success: false, error: 'No Bridge connected — start Bridge CLI on your local machine', tokensUsed: 0 };
    }

    try {
      // Phase 4: send structured argv (prompt is an inert array element — no shell
      // quoting/injection). `command` is kept for back-compat with older bridges.
      const prompt = task.description || task.title;
      const result = await this.bridgeManager.executeCommand(anyBridge.userId, {
        sessionId: `bg-${task.id}`,
        commandId: `bg-cmd-${task.id}`,
        command: `claude --print "${prompt.replace(/"/g, '\\"')}"`,
        argv: ['--print', prompt],
        context: { workingDirectory: '~' },
      });

      return {
        success: true,
        output: typeof result === 'string' ? result : JSON.stringify(result),
        tokensUsed: 0,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Bridge execution failed: ${message}`, tokensUsed: 0 };
    }
  }

  // --------------------------------------------------------------------------
  // Delivery
  // --------------------------------------------------------------------------

  private async deliverResult(task: Johnny5Task, result: TaskResult): Promise<void> {
    // If deliverAt is in the future, store for later delivery
    if (task.deliverAt && task.deliverAt.getTime() > Date.now()) {
      await this.storeNotification(task, result);
      return;
    }

    const summary = result.success
      ? `Task completed: ${task.title}\n\n${result.output?.slice(0, 500) || 'Done'}`
      : `Task failed: ${task.title}\n\nError: ${result.error || 'Unknown error'}`;

    // 1. Socket.IO (instant if user is online)
    if (this.io) {
      this.io.emit('johnny5:task-completed', {
        taskId: task.id,
        title: task.title,
        summary: summary.slice(0, 1000),
        success: result.success,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Telegram (works offline)
    try {
      const { getJohnny5Config } = await import('@/lib/johnny5-config');
      const config = getJohnny5Config();
      const chatId = config.integrations?.telegram?.chatId;
      if (chatId && config.integrations?.telegram?.enabled) {
        const { telegramBot } = await import('./telegram-bot');
        const icon = result.success ? '\u2705' : '\u274c';
        await telegramBot.sendMessage(
          chatId,
          `${icon} *${task.title}*\n\n${summary.slice(0, 3000)}`
        );
      }
    } catch {
      // Non-fatal — Telegram may not be configured
    }

    // 3. Store in notification queue for catch-up
    await this.storeNotification(task, result);
  }

  private async storeNotification(task: Johnny5Task, result: TaskResult): Promise<void> {
    try {
      const db = getDb();
      const summary = result.success
        ? result.output?.slice(0, 2000) || 'Task completed'
        : `Error: ${result.error || 'Unknown'}`;

      db.prepare(`
        INSERT INTO notifications (id, task_id, user_id, message, type, delivered)
        VALUES (?, ?, 'default', ?, ?, 0)
      `).run(
        randomUUID(),
        task.id,
        summary,
        result.success ? 'task_completed' : 'task_failed'
      );
    } catch (err) {
      console.error('[BackgroundExecutor] storeNotification error:', err);
    }
  }

  // --------------------------------------------------------------------------
  // Pending Deliveries
  // --------------------------------------------------------------------------

  private async checkPendingDeliveries(): Promise<void> {
    try {
      const completed = await TaskTracker.getTasks({ status: 'completed', limit: 10 });
      for (const task of completed) {
        if (task.deliverAt && task.deliverAt.getTime() <= Date.now()) {
          // Time to deliver — emit notification
          if (this.io) {
            this.io.emit('johnny5:task-completed', {
              taskId: task.id,
              title: task.title,
              summary: task.result?.summary || 'Task completed',
              success: true,
              timestamp: new Date().toISOString(),
            });
          }
          // Clear deliverAt so we don't re-deliver
          try {
            const db = getDb();
            db.prepare('UPDATE tasks SET deliver_at = NULL WHERE id = ?').run(task.id);
          } catch {
            // Non-fatal
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // --------------------------------------------------------------------------
  // Recovery
  // --------------------------------------------------------------------------

  private async recoverStuckTasks(): Promise<void> {
    try {
      const stuck = await TaskTracker.getTasks({ status: 'in_progress', limit: 20 });
      for (const task of stuck) {
        await TaskTracker.updateTaskStatus(task.id, 'queued');
        console.log(`[BackgroundExecutor] Recovered stuck task: ${task.id.slice(0, 8)}`);
      }
    } catch (err) {
      console.error('[BackgroundExecutor] Recovery error:', err);
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: BackgroundExecutor | null = null;

export function getBackgroundExecutor(): BackgroundExecutor {
  if (!instance) {
    instance = new BackgroundExecutor();
  }
  return instance;
}

export default BackgroundExecutor;
