/**
 * Agent Hub Scheduler
 *
 * Polls agent_hub_cron_tasks every intervalMs and fires due tasks.
 *
 * Integration note: startAgentRun() requires a full AgentRunContext
 * (workspacePath, systemPrompt, skills, model, etc.) that is not stored
 * on CronTask rows. Rather than reconstruct that context here and risk
 * circular imports, we emit `scheduler:task-triggered` on the userId
 * Socket.IO room. server.js should listen for this event and call
 * startAgentRun() with the agent record fetched from the DB.
 */

import { Server } from 'socket.io';
import { Cron } from 'croner';
import { getDueScheduledTasks, updateCronTaskNextRun, CronTask } from './db';
import { FLAGS } from './feature-flags';

let isRunning = false;

export function startAgentHubScheduler(
  io: Server,
  onTaskDue?: (task: CronTask) => Promise<void>,
  opts?: { intervalMs?: number }
): () => void {
  if (!FLAGS.schedulerEnabled) {
    console.log('[agent-hub] Scheduler disabled (SCHEDULER_ENABLED != true) — skipping start');
    return () => {};
  }

  const intervalMs = opts?.intervalMs ?? 60_000;
  console.log('[agent-hub] Scheduler started — polling every', intervalMs / 1000, 'seconds');

  const timer = setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await tickScheduler(io, onTaskDue);
    } catch (err) {
      console.error('[agent-hub] Scheduler tick error:', err);
    } finally {
      isRunning = false;
    }
  }, intervalMs);

  return () => {
    clearInterval(timer);
    console.log('[agent-hub] Scheduler stopped');
  };
}

async function tickScheduler(io: Server, onTaskDue?: (task: CronTask) => Promise<void>): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
  const dueTasks = getDueScheduledTasks(now);
  for (const task of dueTasks) {
    await fireDueScheduledTask(task, io, onTaskDue);
  }
}

async function fireDueScheduledTask(task: CronTask, io: Server, onTaskDue?: (task: CronTask) => Promise<void>): Promise<void> {
  try {
    // Verify a bridge is reachable for this user before advancing next_run_at
    const bridgeManager = (global as Record<string, unknown>).bridgeManager as
      | { getBridgeForUser?: (userId: string) => unknown }
      | undefined;

    if (!bridgeManager?.getBridgeForUser) {
      console.warn('[agent-hub] Scheduler: bridgeManager not available, skipping task', task.id);
      return;
    }

    const bridge = bridgeManager.getBridgeForUser(task.userId);
    if (!bridge) {
      console.warn('[agent-hub] Scheduler: no bridge for user', task.userId, '— will retry next tick');
      return;
    }

    // Compute next_run_at BEFORE emitting to prevent double-fire on slow ticks
    let nextRunAt: string | null = null;
    try {
      const cronInstance = new Cron(task.schedule);
      const next = cronInstance.nextRun();
      if (next) {
        nextRunAt = next.toISOString().replace('T', ' ').replace('Z', '');
      }
    } catch {
      console.error('[agent-hub] Scheduler: invalid cron expression for task', task.id, task.schedule);
      updateCronTaskNextRun(task.id, null);
      return;
    }

    // Advance next_run_at immediately so a concurrent tick cannot double-fire
    updateCronTaskNextRun(task.id, nextRunAt);

    console.log('[agent-hub] Scheduler: firing task', task.id, 'for agent', task.agentId);

    // Notify browser clients (non-blocking, informational)
    io.to(task.userId).emit('scheduler:task-triggered', {
      taskId: task.id,
      agentId: task.agentId,
      userId: task.userId,
      prompt: task.prompt.substring(0, 100),
    });

    // Call server-side handler to actually start the run
    if (onTaskDue) {
      await onTaskDue(task).catch(err => {
        console.error('[agent-hub] Scheduler: onTaskDue error for task', task.id, err);
      });
    }

  } catch (err) {
    console.error('[agent-hub] Scheduler: error firing task', task.id, err);
  }
}
