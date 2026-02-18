/**
 * Johnny5 Cron Service
 *
 * Enables scheduled tasks for proactive AI features:
 * - Daily morning briefs at 7am Mountain Time (America/Denver)
 * - Trend monitoring at regular intervals
 * - Scheduled builds and research tasks
 *
 * Based on ManusLive's cron implementation, adapted for Coder1.
 */

import { randomUUID } from 'crypto';
import { Cron } from 'croner';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export type CronSchedule =
  | { kind: 'at'; atMs: number }        // One-shot at specific timestamp
  | { kind: 'every'; everyMs: number }  // Fixed interval
  | { kind: 'cron'; expr: string; tz?: string };  // Cron expression

export interface CronPayload {
  message: string;
  action?: 'morning_brief' | 'trend_check' | 'build_check' | 'tiktok_content' | 'custom';
  hook?: string; // Pre-queued hook text (for tiktok_content action)
  deliver?: boolean;  // Send notification?
}

export interface CronJob {
  id: string;
  name: string;
  schedule: CronSchedule;
  payload: CronPayload;
  enabled: boolean;
  userId: string;
  createdAt: number;
  lastRun?: number;
  nextRun?: number;
  deleteAfterRun?: boolean;  // For one-shot reminders
}

export interface CronRunRecord {
  timestamp: number;
  status: 'success' | 'failed';
  durationMs: number;
  error?: string;
}

export interface CronServiceConfig {
  storePath: string;
  onJobRun?: (job: CronJob) => Promise<string | void>;
  onNotify?: (message: string, job: CronJob) => void;
}

export const CRON_LIMITS = {
  MAX_JOBS_PER_USER: 100,
  MIN_INTERVAL_MS: 60000,  // No faster than 1/minute
  MAX_EXECUTION_TIME_MS: 30000,  // 30 second timeout
  MAX_HISTORY_PER_JOB: 100,  // Keep last 100 runs
};

// ============================================================================
// Duration Helpers
// ============================================================================

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)\s*(s|sec|second|m|min|minute|h|hr|hour|d|day)s?$/i);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use formats like "30m", "2h", "1d"`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    sec: 1000,
    second: 1000,
    m: 60 * 1000,
    min: 60 * 1000,
    minute: 60 * 1000,
    h: 60 * 60 * 1000,
    hr: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ============================================================================
// Cron Store (File-based persistence)
// ============================================================================

class CronStore {
  private jobsPath: string;
  private runsDir: string;
  private jobs: CronJob[] = [];

  constructor(storePath: string) {
    this.jobsPath = storePath;
    this.runsDir = path.join(path.dirname(storePath), 'cron-runs');
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    const dir = path.dirname(this.jobsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.runsDir)) {
      fs.mkdirSync(this.runsDir, { recursive: true });
    }

    // Load existing jobs
    await this.loadJobs();
  }

  private async loadJobs(): Promise<void> {
    try {
      if (fs.existsSync(this.jobsPath)) {
        const data = fs.readFileSync(this.jobsPath, 'utf-8');
        this.jobs = JSON.parse(data);
      }
    } catch (error) {
      console.warn('[CronStore] Failed to load cron jobs, starting fresh:', error);
      this.jobs = [];
    }
  }

  async saveJobs(): Promise<void> {
    fs.writeFileSync(this.jobsPath, JSON.stringify(this.jobs, null, 2), 'utf-8');
  }

  getJobs(): CronJob[] {
    return [...this.jobs];
  }

  getJob(id: string): CronJob | undefined {
    return this.jobs.find(j => j.id === id);
  }

  getJobsByUser(userId: string): CronJob[] {
    return this.jobs.filter(j => j.userId === userId);
  }

  async addJob(job: CronJob): Promise<{ success: boolean; error?: string }> {
    // Check user limit
    const userJobs = this.getJobsByUser(job.userId);
    if (userJobs.length >= CRON_LIMITS.MAX_JOBS_PER_USER) {
      return { success: false, error: `Maximum job limit (${CRON_LIMITS.MAX_JOBS_PER_USER}) reached` };
    }

    // Validate interval
    if (job.schedule.kind === 'every' && job.schedule.everyMs < CRON_LIMITS.MIN_INTERVAL_MS) {
      return { success: false, error: `Interval too short (minimum ${CRON_LIMITS.MIN_INTERVAL_MS / 1000} seconds)` };
    }

    // Check for duplicate names for this user
    if (userJobs.some(j => j.name === job.name)) {
      return { success: false, error: `Job with name "${job.name}" already exists` };
    }

    this.jobs.push(job);
    await this.saveJobs();
    return { success: true };
  }

  async updateJob(id: string, updates: Partial<CronJob>): Promise<boolean> {
    const index = this.jobs.findIndex(j => j.id === id);
    if (index === -1) return false;

    this.jobs[index] = { ...this.jobs[index], ...updates };
    await this.saveJobs();
    return true;
  }

  async removeJob(id: string): Promise<boolean> {
    const index = this.jobs.findIndex(j => j.id === id);
    if (index === -1) return false;

    this.jobs.splice(index, 1);
    await this.saveJobs();
    return true;
  }

  // ============ RUN HISTORY ============

  private getRunFilePath(jobId: string): string {
    return path.join(this.runsDir, `${jobId}.jsonl`);
  }

  async logRun(jobId: string, record: CronRunRecord): Promise<void> {
    const filePath = this.getRunFilePath(jobId);
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf-8');

    // Prune if too many runs
    await this.pruneRunHistory(jobId);
  }

  async getRunHistory(jobId: string, limit = 20): Promise<CronRunRecord[]> {
    const filePath = this.getRunFilePath(jobId);

    try {
      if (!fs.existsSync(filePath)) return [];

      const data = fs.readFileSync(filePath, 'utf-8');
      const lines = data.trim().split('\n').filter(l => l);
      const records = lines.map(line => JSON.parse(line) as CronRunRecord);

      // Return most recent first
      return records.slice(-limit).reverse();
    } catch {
      return [];
    }
  }

  private async pruneRunHistory(jobId: string): Promise<void> {
    const filePath = this.getRunFilePath(jobId);

    try {
      if (!fs.existsSync(filePath)) return;

      const data = fs.readFileSync(filePath, 'utf-8');
      const lines = data.trim().split('\n').filter(l => l);

      if (lines.length > CRON_LIMITS.MAX_HISTORY_PER_JOB) {
        const keep = lines.slice(-CRON_LIMITS.MAX_HISTORY_PER_JOB);
        fs.writeFileSync(filePath, keep.join('\n') + '\n', 'utf-8');
      }
    } catch {
      // Ignore pruning errors
    }
  }
}

// ============================================================================
// Cron Service
// ============================================================================

class CronService {
  private store: CronStore;
  private onJobRun: (job: CronJob) => Promise<string | void>;
  private onNotify: (message: string, job: CronJob) => void;
  private timers: Map<string, NodeJS.Timeout | Cron> = new Map();
  private running = false;
  private initialized = false;

  constructor(config: CronServiceConfig) {
    this.store = new CronStore(config.storePath);
    this.onJobRun = config.onJobRun || (async () => {});
    this.onNotify = config.onNotify || (() => {});
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.store.initialize();
    this.initialized = true;
  }

  async start(): Promise<void> {
    if (this.running) return;

    await this.initialize();
    this.running = true;

    // Schedule all enabled jobs
    const jobs = this.store.getJobs();
    for (const job of jobs) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }

    console.log(`[CronService] Started with ${jobs.length} jobs`);
  }

  stop(): void {
    this.running = false;

    // Clear all timers
    this.timers.forEach((timer, id) => {
      if (timer instanceof Cron) {
        timer.stop();
      } else {
        clearTimeout(timer);
      }
      this.timers.delete(id);
    });

    console.log('[CronService] Stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  // ============ JOB MANAGEMENT ============

  async addJob(
    name: string,
    schedule: CronSchedule,
    payload: CronPayload,
    userId: string,
    options: { enabled?: boolean; deleteAfterRun?: boolean } = {}
  ): Promise<{ success: boolean; job?: CronJob; error?: string }> {
    await this.initialize();

    const job: CronJob = {
      id: randomUUID(),
      name,
      schedule,
      payload,
      enabled: options.enabled ?? true,
      userId,
      createdAt: Date.now(),
      nextRun: this.computeNextRun(schedule),
      deleteAfterRun: options.deleteAfterRun,
    };

    const result = await this.store.addJob(job);
    if (!result.success) {
      return result;
    }

    if (this.running && job.enabled) {
      this.scheduleJob(job);
    }

    console.log(`[CronService] Added job: ${job.name} (${job.id})`);
    return { success: true, job };
  }

  async addReminder(
    delay: string,
    message: string,
    userId: string
  ): Promise<{ success: boolean; job?: CronJob; error?: string }> {
    try {
      const delayMs = parseDuration(delay);
      const schedule: CronSchedule = { kind: 'at', atMs: Date.now() + delayMs };

      return this.addJob(
        `Reminder: ${message.slice(0, 30)}${message.length > 30 ? '...' : ''}`,
        schedule,
        { message, action: 'custom', deliver: true },
        userId,
        { deleteAfterRun: true }
      );
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async removeJob(id: string): Promise<boolean> {
    // Stop timer if running
    const timer = this.timers.get(id);
    if (timer) {
      if (timer instanceof Cron) {
        timer.stop();
      } else {
        clearTimeout(timer);
      }
      this.timers.delete(id);
    }

    const removed = await this.store.removeJob(id);
    if (removed) {
      console.log(`[CronService] Removed job: ${id}`);
    }
    return removed;
  }

  async enableJob(id: string): Promise<boolean> {
    const job = this.store.getJob(id);
    if (!job) return false;

    await this.store.updateJob(id, { enabled: true });

    if (this.running) {
      this.scheduleJob({ ...job, enabled: true });
    }

    return true;
  }

  async disableJob(id: string): Promise<boolean> {
    // Stop timer if running
    const timer = this.timers.get(id);
    if (timer) {
      if (timer instanceof Cron) {
        timer.stop();
      } else {
        clearTimeout(timer);
      }
      this.timers.delete(id);
    }

    return this.store.updateJob(id, { enabled: false });
  }

  getJobs(): CronJob[] {
    return this.store.getJobs();
  }

  getJobsByUser(userId: string): CronJob[] {
    return this.store.getJobsByUser(userId);
  }

  getJob(id: string): CronJob | undefined {
    return this.store.getJob(id);
  }

  async getJobHistory(jobId: string): Promise<CronRunRecord[]> {
    return this.store.getRunHistory(jobId);
  }

  // ============ SCHEDULING ============

  private scheduleJob(job: CronJob): void {
    // Clear existing timer if any
    const existing = this.timers.get(job.id);
    if (existing) {
      if (existing instanceof Cron) {
        existing.stop();
      } else {
        clearTimeout(existing);
      }
    }

    switch (job.schedule.kind) {
      case 'at': {
        const delay = job.schedule.atMs - Date.now();
        if (delay <= 0) {
          // Already past - run immediately
          this.runJob(job);
        } else {
          const timer = setTimeout(() => this.runJob(job), delay);
          this.timers.set(job.id, timer);
        }
        break;
      }

      case 'every': {
        // Calculate delay until first run
        const now = Date.now();
        const nextRun = job.nextRun || now;
        const delay = Math.max(0, nextRun - now);

        const runAndReschedule = () => {
          this.runJob(job);
          // Schedule next run
          const timer = setTimeout(runAndReschedule, job.schedule.kind === 'every' ? job.schedule.everyMs : 0);
          this.timers.set(job.id, timer);
        };

        const timer = setTimeout(runAndReschedule, delay);
        this.timers.set(job.id, timer);
        break;
      }

      case 'cron': {
        const cronTimer = new Cron(
          job.schedule.expr,
          { timezone: job.schedule.tz || 'America/Los_Angeles' },
          () => this.runJob(job)
        );
        this.timers.set(job.id, cronTimer);
        console.log(`[CronService] Scheduled cron job "${job.name}" with expression: ${job.schedule.expr}`);
        break;
      }
    }
  }

  private async runJob(job: CronJob): Promise<void> {
    const startTime = Date.now();
    let status: 'success' | 'failed' = 'success';
    let error: string | undefined;

    console.log(`[CronService] Running job: ${job.name}`);

    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Execute with timeout
        await this.executeWithTimeout(job);

        // Send notification if requested
        if (job.payload.deliver) {
          this.onNotify(job.payload.message, job);
        }

        break;
      } catch (err: unknown) {
        lastError = err as Error;
        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          await this.sleep(1000 * attempt);
        }
      }
    }

    if (lastError) {
      status = 'failed';
      error = lastError.message;
    }

    const durationMs = Date.now() - startTime;

    // Log run
    const record: CronRunRecord = { timestamp: startTime, status, durationMs, error };
    await this.store.logRun(job.id, record);

    // Update job
    const updates: Partial<CronJob> = {
      lastRun: startTime,
      nextRun: this.computeNextRun(job.schedule),
    };
    await this.store.updateJob(job.id, updates);

    // Delete one-shot jobs after run
    if (job.deleteAfterRun || job.schedule.kind === 'at') {
      await this.removeJob(job.id);
    }

    console.log(`[CronService] Job "${job.name}" completed: ${status} (${durationMs}ms)`);
  }

  private async executeWithTimeout(job: CronJob): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Job execution timed out'));
      }, CRON_LIMITS.MAX_EXECUTION_TIME_MS);

      this.onJobRun(job)
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch(err => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }

  private computeNextRun(schedule: CronSchedule): number {
    const now = Date.now();

    switch (schedule.kind) {
      case 'at':
        return schedule.atMs;

      case 'every':
        return now + schedule.everyMs;

      case 'cron': {
        try {
          const cron = new Cron(schedule.expr, { timezone: schedule.tz || 'America/Los_Angeles' });
          const next = cron.nextRun();
          cron.stop();
          return next?.getTime() || now;
        } catch {
          return now;
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============ DEFAULT JOBS ============

  /**
   * Create default Johnny5 cron jobs if they don't exist
   */
  async createDefaultJobs(userId: string = 'system'): Promise<void> {
    await this.initialize();

    const existingJobs = this.store.getJobs();

    // Default Morning Brief at 7am Mountain Time
    const morningBriefExists = existingJobs.some(j => j.name === 'Daily Morning Brief');
    if (!morningBriefExists) {
      await this.addJob(
        'Daily Morning Brief',
        { kind: 'cron', expr: '0 7 * * *', tz: 'America/Denver' },
        {
          message: 'Good morning! Johnny5 has prepared your daily brief.',
          action: 'morning_brief',
          deliver: true,
        },
        userId
      );
      console.log('[CronService] Created default Morning Brief job (7am Mountain Time daily)');
    }

    // Trend check every 2 hours during business hours
    const trendCheckExists = existingJobs.some(j => j.name === 'Trend Monitor Check');
    if (!trendCheckExists) {
      await this.addJob(
        'Trend Monitor Check',
        { kind: 'cron', expr: '0 9,11,13,15,17 * * 1-5', tz: 'America/Los_Angeles' },
        {
          message: 'Checking trends for new opportunities...',
          action: 'trend_check',
          deliver: false,
        },
        userId
      );
      console.log('[CronService] Created default Trend Monitor job (business hours Mon-Fri)');
    }
  }

  // ============ HELPERS ============

  formatJobInfo(job: CronJob): string {
    let scheduleStr: string;

    switch (job.schedule.kind) {
      case 'at':
        scheduleStr = `at ${new Date(job.schedule.atMs).toLocaleString()}`;
        break;
      case 'every':
        scheduleStr = `every ${formatDuration(job.schedule.everyMs)}`;
        break;
      case 'cron':
        scheduleStr = `cron: ${job.schedule.expr}`;
        break;
    }

    const nextRunStr = job.nextRun
      ? `Next: ${new Date(job.nextRun).toLocaleString()}`
      : '';

    return `[${job.id.slice(0, 8)}] ${job.name} (${scheduleStr}) ${nextRunStr}`;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let cronServiceInstance: CronService | null = null;

export function getCronService(config?: CronServiceConfig): CronService {
  if (!cronServiceInstance) {
    const defaultConfig: CronServiceConfig = {
      storePath: path.join(process.cwd(), 'data', 'johnny5', 'cron-jobs.json'),
      onJobRun: async (job) => {
        console.log(`[CronService] Executing job action: ${job.payload.action || 'custom'}`);

        // Handle tiktok_content action
        if (job.payload.action === 'tiktok_content') {
          try {
            const port = process.env.PORT || '3001';
            const response = await fetch(`http://localhost:${port}/api/johnny5/tiktok`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                hook: job.payload.hook || job.payload.message,
                triggeredBy: 'schedule',
              }),
            });
            const data = await response.json();
            console.log(`[CronService] TikTok content triggered: taskId=${data.taskId}`);
          } catch (err) {
            console.error('[CronService] TikTok content trigger failed:', err);
            throw err;
          }
        }
      },
      onNotify: (message, job) => {
        console.log(`[CronService] Notification: ${message}`);
        // Default implementation - can be overridden to send WebSocket notifications
      },
    };
    cronServiceInstance = new CronService(config || defaultConfig);
  }
  return cronServiceInstance;
}

export function resetCronService(): void {
  if (cronServiceInstance) {
    cronServiceInstance.stop();
    cronServiceInstance = null;
  }
}

export { CronService };
export default getCronService;
