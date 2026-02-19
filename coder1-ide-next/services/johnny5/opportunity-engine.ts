/**
 * Johnny5 Opportunity Engine
 *
 * THE KEY missing component that bridges events → Claude analysis → actions → notifications.
 *
 * Flow:
 * 1. Events arrive from any source (Zapier, Telegram, cron, trends)
 * 2. Events are queued and deduplicated
 * 3. Claude analyzes each event and decides: act, prompt user, or skip
 * 4. Proactivity level gates the decision
 * 5. Actions are executed within permission boundaries
 * 6. Results are logged to audit trail and sent via Telegram
 *
 * Features:
 * - FIFO event queue with max size
 * - Event deduplication (1-hour window)
 * - Token budget tracking with alerts
 * - Retry logic with exponential backoff
 * - Proactivity level checks
 * - Audit logging for all decisions
 */

import { createHash } from 'crypto';
import { logger } from '@/lib/logger';
import { getJohnny5Config, getTelegramChatId } from '@/lib/johnny5-config';
import type { Johnny5TrendAlert } from '@/types/johnny5';
import { telegramBot } from './telegram-bot';
import type { PendingConfirmation } from './telegram-bot';

// ============================================================================
// Types
// ============================================================================

export type EventSource = 'zapier' | 'telegram' | 'cron' | 'trend' | 'conversation' | 'heartbeat';

export interface ExternalEvent {
  source: EventSource;
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface Opportunity {
  id: string;
  source: EventSource;
  event: string;
  description: string;
  suggestedAction: OpportunityAction | null;
  confidence: number;
  decision: 'act' | 'prompt' | 'skip';
  reason: string;
}

export interface OpportunityAction {
  type: 'notify' | 'research' | 'build' | 'alert';
  description: string;
  data: Record<string, unknown>;
}

export interface ActionResult {
  opportunityId: string;
  action: OpportunityAction;
  success: boolean;
  output?: string;
  error?: string;
  tokensUsed: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  source: EventSource;
  eventType: string;
  decision: 'act' | 'prompt' | 'skip';
  reason: string;
  actionDescription?: string;
  result?: 'success' | 'failure' | 'pending';
  error?: string;
  tokensUsed: number;
  proactivityLevel: 'low' | 'medium' | 'high';
}

// ============================================================================
// Configuration
// ============================================================================

interface EngineConfig {
  maxQueueSize: number;
  maxClassificationsPerMinute: number;
  classificationTimeoutMs: number;
  maxRetries: number;
  deduplicationWindowMs: number;
  dailyTokenBudget: number;
}

const DEFAULT_CONFIG: EngineConfig = {
  maxQueueSize: 100,
  maxClassificationsPerMinute: 10,
  classificationTimeoutMs: 30000,
  maxRetries: 3,
  deduplicationWindowMs: 3600000, // 1 hour
  dailyTokenBudget: 100000,
};

// ============================================================================
// Opportunity Engine
// ============================================================================

class OpportunityEngine {
  private config: EngineConfig;
  private eventQueue: ExternalEvent[] = [];
  private isProcessing = false;
  private deduplicationCache = new Map<string, number>(); // hash → timestamp
  private tokensUsedToday = 0;
  private lastTokenReset: Date = new Date();
  private auditLog: AuditLogEntry[] = [];
  private classificationsThisMinute = 0;
  private rateLimitResetTimer: NodeJS.Timeout | null = null;
  private pendingOpportunities = new Map<string, Opportunity>(); // id → opportunity awaiting user confirmation

  // Socket.IO reference (set by server.js after initialization)
  private io: any = null;

  constructor(config?: Partial<EngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Reset rate limit counter every minute
    this.rateLimitResetTimer = setInterval(() => {
      this.classificationsThisMinute = 0;
    }, 60000);

    // Register confirmation callback with Telegram bot
    telegramBot.onConfirmation(async (confirmationId, action) => {
      await this.handleConfirmation(confirmationId, action);
    });
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Ingest an event from any source.
   * Events are queued and processed asynchronously.
   */
  async ingest(event: ExternalEvent): Promise<boolean> {
    // Deduplication check
    const hash = this.hashEvent(event);
    const existingTimestamp = this.deduplicationCache.get(hash);
    if (existingTimestamp && Date.now() - existingTimestamp < this.config.deduplicationWindowMs) {
      logger.debug(`[Johnny5/Engine] Duplicate event skipped: ${event.type}`);
      return false;
    }

    // Queue size check
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      logger.warn(`[Johnny5/Engine] Queue full (${this.config.maxQueueSize}), dropping event: ${event.type}`);
      return false;
    }

    // Add to queue and dedup cache
    this.eventQueue.push(event);
    this.deduplicationCache.set(hash, Date.now());

    // Clean old dedup entries
    this.cleanDeduplicationCache();

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }

    return true;
  }

  /**
   * Set Socket.IO instance for real-time audit events.
   */
  setIO(io: any): void {
    this.io = io;
  }

  /**
   * Get engine health status.
   */
  isHealthy(): boolean {
    return this.eventQueue.length < this.config.maxQueueSize;
  }

  getQueueSize(): number {
    return this.eventQueue.length;
  }

  getTokensUsed(): number {
    this.resetDailyTokensIfNeeded();
    return this.tokensUsedToday;
  }

  getAuditLog(limit: number = 50): AuditLogEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Shutdown the engine.
   */
  shutdown(): void {
    if (this.rateLimitResetTimer) {
      clearInterval(this.rateLimitResetTimer);
      this.rateLimitResetTimer = null;
    }
  }

  // --------------------------------------------------------------------------
  // Queue Processing
  // --------------------------------------------------------------------------

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      // Rate limit check
      if (this.classificationsThisMinute >= this.config.maxClassificationsPerMinute) {
        logger.debug('[Johnny5/Engine] Rate limit reached, waiting...');
        await this.delay(5000);
        continue;
      }

      // Token budget check
      this.resetDailyTokensIfNeeded();
      if (this.tokensUsedToday >= this.config.dailyTokenBudget * 0.9) {
        logger.warn('[Johnny5/Engine] Token budget at 90%, pausing classifications');
        await this.notifyBudgetWarning();
        break;
      }

      const event = this.eventQueue.shift()!;

      try {
        await this.processEvent(event);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[Johnny5/Engine] Event processing failed: ${message}`);
        this.logAudit({
          source: event.source,
          eventType: event.type,
          decision: 'skip',
          reason: `Processing error: ${message}`,
          tokensUsed: 0,
        });
      }
    }

    this.isProcessing = false;
  }

  private async processEvent(event: ExternalEvent): Promise<void> {
    const config = getJohnny5Config();

    // Proactivity gate: low = don't classify, just log
    if (config.proactivityLevel === 'low') {
      this.logAudit({
        source: event.source,
        eventType: event.type,
        decision: 'skip',
        reason: 'Proactivity level is low',
        tokensUsed: 0,
      });
      return;
    }

    // Classify the event using Claude
    const opportunity = await this.classify(event);

    if (!opportunity || opportunity.decision === 'skip') {
      this.logAudit({
        source: event.source,
        eventType: event.type,
        decision: 'skip',
        reason: opportunity?.reason || 'No actionable opportunity',
        tokensUsed: 0,
      });
      return;
    }

    // Medium proactivity: prompt user before acting
    if (config.proactivityLevel === 'medium' || opportunity.decision === 'prompt') {
      await this.promptUser(opportunity);
      this.logAudit({
        source: event.source,
        eventType: event.type,
        decision: 'prompt',
        reason: opportunity.reason,
        actionDescription: opportunity.suggestedAction?.description,
        result: 'pending',
        tokensUsed: 0,
      });
      return;
    }

    // High proactivity: execute automatically
    if (config.proactivityLevel === 'high' && opportunity.decision === 'act') {
      // Permission check
      if (!this.checkPermissions(opportunity)) {
        this.logAudit({
          source: event.source,
          eventType: event.type,
          decision: 'skip',
          reason: 'Insufficient permissions',
          tokensUsed: 0,
        });
        return;
      }

      const result = await this.execute(opportunity);
      this.logAudit({
        source: event.source,
        eventType: event.type,
        decision: 'act',
        reason: opportunity.reason,
        actionDescription: opportunity.suggestedAction?.description,
        result: result.success ? 'success' : 'failure',
        error: result.error,
        tokensUsed: result.tokensUsed,
      });

      // Notify via Telegram
      await this.notifyResult(opportunity, result);
    }
  }

  // --------------------------------------------------------------------------
  // Classification (AI-Driven)
  // --------------------------------------------------------------------------

  private async classify(event: ExternalEvent): Promise<Opportunity | null> {
    const config = getJohnny5Config();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      logger.warn('[Johnny5/Engine] No ANTHROPIC_API_KEY, skipping classification');
      return null;
    }

    this.classificationsThisMinute++;

    const prompt = `You are Johnny5, an autonomous AI assistant for Mike (a serial entrepreneur with multiple SaaS companies).

An event just occurred:
Source: ${event.source}
Type: ${event.type}
Data: ${JSON.stringify(event.data, null, 2)}

Mike's proactivity preference: ${config.proactivityLevel}
Mike's permissions for you: ${JSON.stringify(config.permissions)}

Based on this event, respond with ONLY a JSON object (no markdown, no explanation):
{
  "decision": "act" | "prompt" | "skip",
  "reason": "Brief explanation",
  "confidence": 0.0-1.0,
  "action": {
    "type": "notify" | "research" | "build" | "alert",
    "description": "What to do"
  } | null
}

Rules:
- "act" = Take action automatically (only for high confidence + permissions allow)
- "prompt" = Ask Mike for confirmation first
- "skip" = Not actionable, just log it
- Be conservative. When in doubt, "prompt" not "act".
- Only suggest actions within the given permissions.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.classificationTimeoutMs);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6-20250514',
          max_tokens: 500,
          temperature: 0.1,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text || '';
      const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
      this.tokensUsedToday += tokensUsed;

      // Parse JSON from response
      const parsed = this.parseClassification(content);
      if (!parsed) return null;

      return {
        id: `opp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        source: event.source,
        event: event.type,
        description: parsed.reason || 'No description',
        suggestedAction: parsed.action || null,
        confidence: parsed.confidence || 0.5,
        decision: parsed.decision || 'skip',
        reason: parsed.reason || 'Unknown',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('aborted')) {
        logger.warn('[Johnny5/Engine] Classification timeout');
      } else {
        logger.error(`[Johnny5/Engine] Classification failed: ${message}`);
      }
      return null;
    }
  }

  private parseClassification(content: string): any {
    try {
      // Try to extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch {
      logger.warn('[Johnny5/Engine] Failed to parse classification response');
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Permission Checking
  // --------------------------------------------------------------------------

  private checkPermissions(opportunity: Opportunity): boolean {
    const config = getJohnny5Config();
    const action = opportunity.suggestedAction;

    if (!action) return false;

    switch (action.type) {
      case 'notify':
        return true; // Always allowed
      case 'alert':
        return true; // Always allowed
      case 'research':
        return config.permissions.externalRequests;
      case 'build':
        return config.permissions.suggestCode && config.permissions.readFiles;
      default:
        return false;
    }
  }

  // --------------------------------------------------------------------------
  // Action Execution
  // --------------------------------------------------------------------------

  private async execute(opportunity: Opportunity): Promise<ActionResult> {
    const action = opportunity.suggestedAction;
    if (!action) {
      return {
        opportunityId: opportunity.id,
        action: { type: 'notify', description: 'No action', data: {} },
        success: false,
        error: 'No action specified',
        tokensUsed: 0,
      };
    }

    // For now, the primary action is notification.
    // Build and research actions will be wired up when proactive-builder
    // and trend-monitor mocks are replaced.
    switch (action.type) {
      case 'notify':
      case 'alert':
        return {
          opportunityId: opportunity.id,
          action,
          success: true,
          output: action.description,
          tokensUsed: 0,
        };

      case 'research': {
        try {
          const { TaskTracker: TT } = require('./task-tracker');
          const researchTask = await TT.createTask({
            title: action.description,
            description: JSON.stringify(action.data),
            type: 'research',
            priority: 'medium',
            triggeredBy: 'trend',
          });
          return {
            opportunityId: opportunity.id,
            action,
            success: true,
            output: `Research task created: ${researchTask.id}`,
            tokensUsed: 0,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            opportunityId: opportunity.id,
            action,
            success: false,
            error: `Failed to create research task: ${msg}`,
            tokensUsed: 0,
          };
        }
      }

      case 'build': {
        try {
          const { TaskTracker: TT } = require('./task-tracker');
          const buildTask = await TT.createTask({
            title: action.description,
            description: JSON.stringify(action.data),
            type: 'build',
            priority: 'medium',
            triggeredBy: 'trend',
          });
          return {
            opportunityId: opportunity.id,
            action,
            success: true,
            output: `Build task created: ${buildTask.id}`,
            tokensUsed: 0,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            opportunityId: opportunity.id,
            action,
            success: false,
            error: `Failed to create build task: ${msg}`,
            tokensUsed: 0,
          };
        }
      }

      default:
        return {
          opportunityId: opportunity.id,
          action,
          success: false,
          error: `Unknown action type: ${action.type}`,
          tokensUsed: 0,
        };
    }
  }

  // --------------------------------------------------------------------------
  // User Prompting (Medium Proactivity)
  // --------------------------------------------------------------------------

  private async promptUser(opportunity: Opportunity): Promise<void> {
    // Always emit to Socket.IO opportunity panel
    if (this.io) {
      this.io.emit('johnny5:opportunity', {
        type: 'confirmation_needed',
        opportunity,
        timestamp: new Date().toISOString(),
      });
    }

    // Push a summary into the chat tab stream so Mike sees it regardless of active tab
    const chatMessage = `💡 **Opportunity spotted** (${opportunity.source})\n\n${opportunity.description}\n\n_Suggested: ${opportunity.suggestedAction?.description || 'Review and decide'}_`;
    if (this.io) {
      this.io.emit('johnny5:chat-push', {
        id: `opp-${opportunity.id}-${Date.now()}`,
        content: chatMessage,
        timestamp: new Date().toISOString(),
      });
    }

    // Store opportunity so handleConfirmation can execute it when user responds
    this.pendingOpportunities.set(opportunity.id, opportunity);

    // Send to Telegram (uses env var-aware getTelegramChatId)
    const chatId = getTelegramChatId();
    if (chatId) {
      const confirmation: PendingConfirmation = {
        id: opportunity.id,
        description: `*${opportunity.event}* (${opportunity.source})\n\n${opportunity.description}\n\nSuggested: ${opportunity.suggestedAction?.description || 'None'}\nConfidence: ${(opportunity.confidence * 100).toFixed(0)}%`,
        actionData: opportunity.suggestedAction?.data || {},
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
      };
      try {
        await telegramBot.sendConfirmation(chatId, confirmation);
      } catch (err) {
        logger.error('[Johnny5/Engine] Failed to send Telegram confirmation:', err);
      }
    } else {
      logger.debug('[Johnny5/Engine] No Telegram chatId, prompt delivered to IDE only');
    }
  }

  private async handleConfirmation(
    confirmationId: string,
    action: 'confirm' | 'skip'
  ): Promise<void> {
    const opportunity = this.pendingOpportunities.get(confirmationId);
    this.pendingOpportunities.delete(confirmationId);

    if (action === 'confirm') {
      logger.info(`[Johnny5/Engine] User confirmed opportunity: ${confirmationId}`);

      if (opportunity?.suggestedAction) {
        const result = await this.execute(opportunity);
        this.logAudit({
          source: 'telegram',
          eventType: opportunity.event,
          decision: 'act',
          reason: 'User confirmed via Telegram',
          actionDescription: opportunity.suggestedAction.description,
          result: result.success ? 'success' : 'failure',
          error: result.error,
          tokensUsed: result.tokensUsed,
        });
        await this.notifyResult(opportunity, result);
      } else {
        this.logAudit({
          source: 'telegram',
          eventType: 'user_confirmation',
          decision: 'act',
          reason: 'User confirmed but no action found for opportunity',
          tokensUsed: 0,
        });
      }
    } else {
      logger.info(`[Johnny5/Engine] User skipped opportunity: ${confirmationId}`);
      this.logAudit({
        source: 'telegram',
        eventType: opportunity?.event || 'user_skip',
        decision: 'skip',
        reason: 'User skipped via Telegram',
        tokensUsed: 0,
      });
    }
  }

  // --------------------------------------------------------------------------
  // Notifications
  // --------------------------------------------------------------------------

  private async notifyResult(opportunity: Opportunity, result: ActionResult): Promise<void> {
    // Use env var-aware getTelegramChatId (works on Render without local config)
    const chatId = getTelegramChatId();

    if (chatId) {
      const title = result.success ? opportunity.event : `Failed: ${opportunity.event}`;
      const description = result.output || result.error || 'No details';
      try {
        await telegramBot.notifyAction(chatId, title, description, result.success ? 'success' : 'failure');
      } catch (err) {
        logger.error('[Johnny5/Engine] Failed to send Telegram action result:', err);
      }
    }

    // Emit to Socket.IO action panel
    if (this.io) {
      this.io.emit('johnny5:action', {
        type: 'action_result',
        opportunity: { id: opportunity.id, source: opportunity.source, event: opportunity.event },
        result: { success: result.success, output: result.output, error: result.error },
        timestamp: new Date().toISOString(),
      });
    }

    // Push result into chat tab stream
    const resultEmoji = result.success ? '✅' : '❌';
    const chatMessage = `${resultEmoji} **${opportunity.event}**\n${result.output || result.error || 'Completed'}`;
    if (this.io) {
      this.io.emit('johnny5:chat-push', {
        id: `result-${opportunity.id}-${Date.now()}`,
        content: chatMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async notifyBudgetWarning(): Promise<void> {
    const config = getJohnny5Config();
    const chatId = config.integrations.telegram?.chatId;
    const pct = ((this.tokensUsedToday / this.config.dailyTokenBudget) * 100).toFixed(0);

    if (chatId) {
      await telegramBot.sendMessage(
        chatId,
        `*Johnny5 Token Budget Warning*\n\nUsed ${pct}% of daily budget (${this.tokensUsedToday}/${this.config.dailyTokenBudget} tokens).\nProactive classifications paused until tomorrow.`
      );
    }
  }

  // --------------------------------------------------------------------------
  // Audit Logging
  // --------------------------------------------------------------------------

  private logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'proactivityLevel'>): void {
    const config = getJohnny5Config();
    const fullEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      proactivityLevel: config.proactivityLevel,
      ...entry,
    };

    this.auditLog.push(fullEntry);

    // Keep last 500 entries in memory
    if (this.auditLog.length > 500) {
      this.auditLog = this.auditLog.slice(-500);
    }

    // Emit to Socket.IO for real-time dashboard
    if (this.io) {
      this.io.emit('johnny5:audit', fullEntry);
    }

    logger.debug(
      `[Johnny5/Audit] ${fullEntry.decision.toUpperCase()} | ${fullEntry.source}:${fullEntry.eventType} | ${fullEntry.reason}`
    );
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  private hashEvent(event: ExternalEvent): string {
    const data = `${event.source}:${event.type}:${JSON.stringify(event.data)}`;
    return createHash('sha256').update(data).digest('hex').slice(0, 16);
  }

  private cleanDeduplicationCache(): void {
    const now = Date.now();
    for (const [hash, timestamp] of this.deduplicationCache) {
      if (now - timestamp > this.config.deduplicationWindowMs) {
        this.deduplicationCache.delete(hash);
      }
    }
  }

  private resetDailyTokensIfNeeded(): void {
    const now = new Date();
    if (now.getDate() !== this.lastTokenReset.getDate()) {
      this.tokensUsedToday = 0;
      this.lastTokenReset = now;
      logger.info('[Johnny5/Engine] Daily token budget reset');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const opportunityEngine = new OpportunityEngine();

export default opportunityEngine;
