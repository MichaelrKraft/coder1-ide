/**
 * Johnny5 cron worker — standalone process designed for Render Background Worker.
 *
 * Why this exists:
 *   The in-process scheduler in server.js dies whenever the web process
 *   restarts or sleeps. Render's web tier can sleep, restarts on deploy,
 *   and scales horizontally (which would duplicate cron fires). A
 *   dedicated worker process is the correct home for the scheduler.
 *
 * What this does:
 *   - Loads the same cron-service.ts that server.js uses.
 *   - Wires a worker-friendly onJobRun callback: morning briefs generate
 *     + ship to Telegram; trend checks log + skip the Socket.IO emit that
 *     only the web process can do; other actions log.
 *   - Heartbeats every 5 min so the user can confirm via Render logs.
 *   - Handles SIGTERM gracefully (Render sends one on deploy).
 *
 * Run locally:    npm run cron-worker
 * Run on Render:  add a `worker` service that calls `npm run cron-worker`
 */

import * as path from 'path'
import { getCronService } from '@/services/johnny5/cron-service'
import type { CronJob } from '@/services/johnny5/cron-service'
import { generateMorningBrief } from '@/services/johnny5/morning-brief-generator'
import { getTelegramBotToken, getTelegramChatId } from '@/lib/johnny5-config'

const HEARTBEAT_MS = 5 * 60 * 1000 // 5 min

function log(msg: string, meta?: Record<string, unknown>): void {
  const stamp = new Date().toISOString()
  if (meta) console.log(`[cron-worker ${stamp}] ${msg}`, JSON.stringify(meta))
  else console.log(`[cron-worker ${stamp}] ${msg}`)
}

async function sendTelegram(message: string): Promise<void> {
  const token = getTelegramBotToken()
  const chatId = getTelegramChatId()
  if (!token || !chatId) {
    log('Telegram skipped — no token or chat_id configured')
    return
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    })
    const data = (await res.json()) as { ok: boolean; description?: string }
    if (data.ok) log('Telegram sent')
    else log('Telegram error', { description: data.description })
  } catch (err) {
    log('Telegram failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

async function onJobRun(job: CronJob): Promise<void> {
  log('Executing job', { name: job.name, action: job.payload.action ?? 'custom' })

  switch (job.payload.action) {
    case 'morning_brief': {
      try {
        const brief = await generateMorningBrief(new Date())
        log('Morning brief generated', { id: brief.id })
        await sendTelegram(`📋 *Morning Brief*\n\n${brief.summary}`)
      } catch (err) {
        log('Morning brief failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
      break
    }

    case 'trend_check':
    case 'build_check':
    case 'content_factory':
    case 'memory_compress':
    case 'ph_scout':
    case 'full_flow_factory':
    case 'tiktok_content':
    case 'custom':
    default: {
      // These actions historically used Socket.IO to push to connected
      // web clients. The worker has no Socket.IO; for v1 we log only.
      // Web-side polling can pick up state from disk on next page load.
      log('Action not yet wired in worker — logged only', {
        action: job.payload.action ?? 'custom',
        jobName: job.name,
      })
    }
  }
}

async function main(): Promise<void> {
  log('Starting Johnny5 cron worker')
  log('Environment', {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME ?? 'standalone',
    CODER1_DATA_DIR: process.env.CODER1_DATA_DIR ?? '<unset>',
  })

  // storePath matches server.js: data/johnny5/cron-jobs.json under the
  // project root. The bundled file is the source of truth for which jobs
  // exist; lastRun persistence within a deploy is best-effort.
  const storePath = path.join(process.cwd(), 'data', 'johnny5', 'cron-jobs.json')
  log('Using cron store', { storePath })

  const cronService = getCronService({
    storePath,
    onJobRun,
    onNotify: (message: string, job: CronJob) => {
      log('Notification', { message, jobName: job.name, action: job.payload.action })
    },
  })

  await cronService.initialize()
  await cronService.createDefaultJobs('system')
  await cronService.start()

  const jobs = cronService.getJobs()
  log(`Cron service started`, {
    enabled: jobs.filter((j) => j.enabled).length,
    total: jobs.length,
  })
  for (const job of jobs) {
    log(`  → ${job.name} (${job.enabled ? 'enabled' : 'disabled'})`)
  }

  // Heartbeat so the user can confirm via Render logs that the worker is alive.
  setInterval(() => {
    log('Heartbeat', {
      uptime_sec: Math.round(process.uptime()),
      enabled_jobs: cronService.getJobs().filter((j) => j.enabled).length,
    })
  }, HEARTBEAT_MS).unref()

  // Graceful shutdown on Render deploy / SIGTERM.
  function shutdown(signal: string): void {
    log(`Received ${signal} — shutting down`)
    try {
      cronService.stop()
      log('Cron service stopped cleanly')
      process.exit(0)
    } catch (err) {
      log('Shutdown error', { error: err instanceof Error ? err.message : String(err) })
      process.exit(1)
    }
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Surface unhandled errors instead of silently swallowing them.
  process.on('uncaughtException', (err) => {
    log('Uncaught exception', { error: err.message, stack: err.stack })
  })
  process.on('unhandledRejection', (reason) => {
    log('Unhandled rejection', { reason: String(reason) })
  })

  log('Worker is now armed — schedules will fire per cron-jobs.json')
}

void main().catch((err: unknown) => {
  log('FATAL — main() threw', {
    error: err instanceof Error ? err.message : String(err),
  })
  process.exit(1)
})
