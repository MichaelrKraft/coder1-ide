/**
 * Johnny5 Telegram Bot Service
 *
 * Primary notification channel for proactive actions.
 * Two-way communication: Mike sends commands, Johnny5 sends notifications.
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Message rate limiting (25/sec)
 * - Long message splitting (4000 char Telegram limit)
 * - Inline confirmation buttons for medium proactivity
 * - Graceful shutdown
 */

import { Telegraf } from 'telegraf';
import { logger } from '@/lib/logger';
import { getJohnny5Config, getTelegramBotToken, saveConfig } from '@/lib/johnny5-config';
import type { TelegramIntegration } from '@/lib/johnny5-config';
import { initializeDb, getTelegramSession, setTelegramSession, getOrCreateMainSession } from '@/lib/johnny5-db';

// ============================================================================
// Types
// ============================================================================

export interface TelegramNotification {
  chatId: string;
  message: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: Record<string, unknown>;
}

export interface PendingConfirmation {
  id: string;
  description: string;
  actionData: Record<string, unknown>;
  expiresAt: number;
  createdAt: number;
}

export type ConfirmationCallback = (
  confirmationId: string,
  action: 'confirm' | 'skip' | 'details'
) => Promise<void>;

// ============================================================================
// Constants
// ============================================================================

const MAX_MESSAGE_LENGTH = 4000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RATE_LIMIT_DELAY_MS = 50; // ~20 msgs/sec with buffer
const CONFIRMATION_EXPIRY_MS = 3600000; // 1 hour
const CONFIRMATION_CLEANUP_INTERVAL_MS = 600000; // 10 minutes

// ============================================================================
// Telegram Bot Service
// ============================================================================

class Johnny5TelegramBot {
  private bot: Telegraf | null = null;
  private isConnected = false;
  private isShuttingDown = false;
  private reconnectAttempts = 0;
  private pendingConfirmations = new Map<string, PendingConfirmation>();
  private confirmationCallback: ConfirmationCallback | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private lastSendTime = 0;

  // Message debouncing for rapid messages
  private messageQueues = new Map<string, {
    messages: string[];
    timeout: NodeJS.Timeout | null;
  }>();
  private readonly DEBOUNCE_MS = 1500;

  // Typing indicator timers per chat
  private typingTimers = new Map<string, NodeJS.Timeout>();

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Start the Telegram bot. Validates token before launching.
   */
  async start(): Promise<boolean> {
    // Initialize database for Telegram session mapping
    try {
      await initializeDb();
    } catch (dbError) {
      logger.warn('[Johnny5/Telegram] Database init failed (non-fatal):', dbError);
    }

    const config = getJohnny5Config();
    const telegram = config.integrations.telegram;

    if (!telegram?.enabled) {
      logger.debug('[Johnny5/Telegram] Telegram integration not enabled');
      return false;
    }

    const token = getTelegramBotToken();
    if (!token) {
      logger.error('[Johnny5/Telegram] No bot token configured');
      return false;
    }

    try {
      this.bot = new Telegraf(token);
      this.setupHandlers();

      // Validate token by calling getMe
      const me = await this.bot.telegram.getMe();
      logger.info(`[Johnny5/Telegram] Bot connected as @${me.username}`);

      // Start polling (non-blocking)
      this.bot.launch().catch((error) => {
        logger.error('[Johnny5/Telegram] Polling error:', error.message);
        this.handleDisconnect();
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Start cleanup interval for expired confirmations
      this.cleanupInterval = setInterval(
        () => this.cleanupExpiredConfirmations(),
        CONFIRMATION_CLEANUP_INTERVAL_MS
      );

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[Johnny5/Telegram] Failed to start: ${message}`);
      this.handleDisconnect();
      return false;
    }
  }

  /**
   * Gracefully stop the bot.
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.bot) {
      this.bot.stop('SIGTERM');
      this.bot = null;
    }

    this.isConnected = false;
    this.pendingConfirmations.clear();
    logger.info('[Johnny5/Telegram] Bot stopped');
  }

  // --------------------------------------------------------------------------
  // Connection Management
  // --------------------------------------------------------------------------

  private handleDisconnect(): void {
    this.isConnected = false;

    if (this.isShuttingDown) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error(
        `[Johnny5/Telegram] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`
      );
      return;
    }

    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.reconnectAttempts++;
    logger.info(
      `[Johnny5/Telegram] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );

    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.start();
      }
    }, delay);
  }

  // --------------------------------------------------------------------------
  // Message Sending
  // --------------------------------------------------------------------------

  /**
   * Send a message with rate limiting and long message splitting.
   */
  async sendMessage(chatId: string, text: string, parseMode?: 'Markdown' | 'HTML'): Promise<boolean> {
    if (!this.bot || !this.isConnected) {
      logger.warn('[Johnny5/Telegram] Cannot send: bot not connected');
      return false;
    }

    try {
      const parts = this.splitMessage(text);

      for (let i = 0; i < parts.length; i++) {
        await this.rateLimitDelay();

        const prefix = parts.length > 1 ? `(${i + 1}/${parts.length}) ` : '';
        await this.bot.telegram.sendMessage(chatId, prefix + parts[i], {
          parse_mode: parseMode || 'Markdown',
        });
      }

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[Johnny5/Telegram] Send failed: ${message}`);
      return false;
    }
  }

  /**
   * Send an action notification.
   */
  async notifyAction(
    chatId: string,
    title: string,
    description: string,
    result: 'success' | 'failure' | 'pending'
  ): Promise<boolean> {
    const icon = result === 'success' ? '✅' : result === 'failure' ? '❌' : '⏳';
    const message = `${icon} *${title}*\n\n${description}`;
    return this.sendMessage(chatId, message);
  }

  /**
   * Send a confirmation request with inline buttons (for medium proactivity).
   */
  async sendConfirmation(
    chatId: string,
    confirmation: PendingConfirmation
  ): Promise<boolean> {
    if (!this.bot || !this.isConnected) return false;

    this.pendingConfirmations.set(confirmation.id, confirmation);

    try {
      await this.bot.telegram.sendMessage(
        chatId,
        `*Opportunity Detected*\n\n${confirmation.description}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Do it', callback_data: `j5:confirm:${confirmation.id}` },
                { text: 'Skip', callback_data: `j5:skip:${confirmation.id}` },
                { text: 'Details', callback_data: `j5:details:${confirmation.id}` },
              ],
            ],
          },
        }
      );
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[Johnny5/Telegram] Confirmation send failed: ${message}`);
      this.pendingConfirmations.delete(confirmation.id);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  private setupHandlers(): void {
    if (!this.bot) return;

    // Commands
    this.bot.command('start', (ctx) => this.handleStart(ctx));
    this.bot.command('status', (ctx) => this.handleStatus(ctx));
    this.bot.command('tasks', (ctx) => this.handleTasks(ctx));
    this.bot.command('help', (ctx) => this.handleHelp(ctx));

    // Inline button callbacks
    this.bot.on('callback_query', async (ctx) => {
      const data = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : null;
      if (!data || !data.startsWith('j5:')) return;

      const parts = data.split(':');
      if (parts.length < 3) return;

      const action = parts[1] as 'confirm' | 'skip' | 'details';
      const confirmationId = parts[2];

      const pending = this.pendingConfirmations.get(confirmationId);

      if (!pending) {
        await ctx.answerCbQuery('This confirmation has expired.');
        return;
      }

      if (action === 'details') {
        await ctx.answerCbQuery();
        await this.sendMessage(
          ctx.chat?.id?.toString() || '',
          `*Details:*\n\`\`\`\n${JSON.stringify(pending.actionData, null, 2)}\n\`\`\``
        );
        return;
      }

      // Confirm or skip - remove from pending
      this.pendingConfirmations.delete(confirmationId);

      if (this.confirmationCallback) {
        await this.confirmationCallback(confirmationId, action);
      }

      const msg = action === 'confirm' ? 'Action approved!' : 'Skipped.';
      await ctx.answerCbQuery(msg);
    });

    // Text messages — forward to Johnny5 chat API
    this.bot.on('text', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const userId = ctx.from?.id.toString() || 'unknown';
      const message = ctx.message.text;
      const username = ctx.from?.username || ctx.from?.first_name || 'Telegram User';

      logger.info(`[Johnny5/Telegram] Message from ${username}: ${message.substring(0, 80)}`);

      this.queueMessage(chatId, userId, username, message, ctx);
    });
  }

  private async handleStart(ctx: any): Promise<void> {
    const chatId = ctx.chat?.id?.toString();

    // Save chatId for proactive notifications
    if (chatId) {
      const config = getJohnny5Config();
      const existingChatId = config.integrations.telegram?.chatId;
      if (existingChatId !== chatId) {
        saveConfig({
          integrations: {
            ...config.integrations,
            telegram: { ...config.integrations.telegram!, chatId },
          },
        });
        logger.info(`[Johnny5/Telegram] Saved chatId: ${chatId}`);
      }
    }

    const msg = [
      '*Hey Mike!* Johnny5 is online and ready.',
      '',
      'I can send you proactive notifications and you can check on things from here.',
      '',
      '*Commands:*',
      '/status - Check Johnny5 status',
      '/tasks - View current tasks',
      '/help - Full command list',
    ].join('\n');

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  private async handleStatus(ctx: any): Promise<void> {
    const config = getJohnny5Config();
    const msg = [
      '*Johnny5 Status*',
      '',
      `Proactivity: ${config.proactivityLevel}`,
      `Permissions: ${Object.entries(config.permissions).filter(([, v]) => v).map(([k]) => k).join(', ') || 'None'}`,
      `Pending confirmations: ${this.pendingConfirmations.size}`,
      `Connected: ${this.isConnected}`,
    ].join('\n');

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  private async handleTasks(ctx: any): Promise<void> {
    await ctx.reply('Task listing coming soon. Use the Coder1 IDE for full task management.', {
      parse_mode: 'Markdown',
    });
  }

  private async handleHelp(ctx: any): Promise<void> {
    const msg = [
      '*Johnny5 Commands*',
      '',
      '/status - Check Johnny5 status',
      '/tasks - View current tasks',
      '/help - Show this message',
      '',
      'You can also send text messages and Johnny5 will process them.',
    ].join('\n');

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  // --------------------------------------------------------------------------
  // Two-Way Chat: Message Processing
  // --------------------------------------------------------------------------

  /**
   * Queue a message with debouncing to batch rapid sequential messages.
   */
  private queueMessage(
    chatId: string,
    userId: string,
    username: string,
    message: string,
    ctx: any
  ): void {
    const key = `${userId}:${chatId}`;

    if (!this.messageQueues.has(key)) {
      this.messageQueues.set(key, { messages: [], timeout: null });
    }

    const queue = this.messageQueues.get(key)!;
    queue.messages.push(message);

    if (queue.timeout) {
      clearTimeout(queue.timeout);
    }

    queue.timeout = setTimeout(async () => {
      const messages = [...queue.messages];
      queue.messages = [];
      queue.timeout = null;

      const combinedMessage = messages.join('\n\n');
      await this.processMessage(chatId, userId, username, combinedMessage, ctx);
    }, this.DEBOUNCE_MS);
  }

  /**
   * Process a message: look up session, call Johnny5 API, send response.
   */
  private async processMessage(
    chatId: string,
    userId: string,
    username: string,
    message: string,
    ctx: any
  ): Promise<void> {
    // Start typing indicator loop (refreshes every 4s before Telegram's 5s expiry)
    this.startTypingIndicator(chatId);

    try {
      // Look up existing session — fall back to the shared main session for unified history
      let sessionId = getTelegramSession(userId, chatId) || '';
      if (!sessionId) {
        sessionId = getOrCreateMainSession();
        setTelegramSession(userId, chatId, sessionId);
        logger.info(`[Johnny5/Telegram] Using main session for ${userId}:${chatId} → ${sessionId}`);
      }

      const result = await this.callJohnny5Chat(sessionId, message);

      // Persist session mapping for conversation continuity
      if (result.sessionId && result.sessionId !== sessionId) {
        setTelegramSession(userId, chatId, result.sessionId);
        logger.info(`[Johnny5/Telegram] Session mapped: ${userId}:${chatId} → ${result.sessionId}`);
      }

      if (result.response) {
        const sent = await this.sendMessage(chatId, result.response);
        if (!sent) {
          // Markdown parse failed — retry as plain text
          try {
            const parts = this.splitMessage(result.response);
            for (const part of parts) {
              await this.bot!.telegram.sendMessage(chatId, part);
            }
          } catch {
            await ctx.reply('I got a response but had trouble sending it. Please try again.');
          }
        }
      } else {
        await ctx.reply("I processed your message but couldn't generate a response. Please try again.");
      }
    } catch (error: any) {
      logger.error('[Johnny5/Telegram] Error processing message:', error);

      if (error.status === 402) {
        await ctx.reply('Message quota exceeded. Please upgrade your plan to continue.');
      } else if (error.status === 503 || error.status === 502) {
        await ctx.reply('Johnny5 is temporarily unavailable. Please try again in a moment.');
      } else if (error.status === 504) {
        await ctx.reply('Request timed out. Try a simpler question.');
      } else {
        await ctx.reply('Sorry, I encountered an error. Please try again.');
      }
    } finally {
      this.stopTypingIndicator(chatId);
    }
  }

  /**
   * Call the Johnny5 chat API and return the response text and session ID.
   */
  private async callJohnny5Chat(
    sessionId: string,
    message: string
  ): Promise<{ response: string | null; sessionId: string }> {
    const port = process.env.PORT || 3001;
    const baseUrl = `http://localhost:${port}`;

    const body: Record<string, unknown> = {
      message,
      enableMemoryInjection: true,
    };

    if (sessionId) {
      body.sessionId = sessionId;
    }

    const response = await fetch(`${baseUrl}/api/johnny5/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = new Error(`Chat API error: ${response.status}`) as any;
      error.status = response.status;
      throw error;
    }

    const data = await response.json();

    if (data.success && data.data?.response) {
      return {
        response: data.data.response,
        sessionId: data.data.sessionId || sessionId,
      };
    }

    return { response: null, sessionId };
  }

  // --------------------------------------------------------------------------
  // Typing Indicator
  // --------------------------------------------------------------------------

  /**
   * Start a repeating typing indicator for a chat (refreshes every 4s).
   */
  private startTypingIndicator(chatId: string): void {
    this.stopTypingIndicator(chatId);

    const loop = async () => {
      try {
        if (!this.bot) return;
        await this.bot.telegram.sendChatAction(chatId, 'typing');
      } catch {
        this.stopTypingIndicator(chatId);
        return;
      }
      const timer = setTimeout(loop, 4000);
      this.typingTimers.set(chatId, timer);
    };

    loop();
  }

  /**
   * Stop the typing indicator loop for a chat.
   */
  private stopTypingIndicator(chatId: string): void {
    const timer = this.typingTimers.get(chatId);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(chatId);
    }
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /**
   * Split a message into parts that fit within Telegram's character limit.
   */
  private splitMessage(text: string): string[] {
    if (text.length <= MAX_MESSAGE_LENGTH) return [text];

    const parts: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= MAX_MESSAGE_LENGTH) {
        parts.push(remaining);
        break;
      }

      // Try to split at a newline
      let splitIndex = remaining.lastIndexOf('\n', MAX_MESSAGE_LENGTH);
      if (splitIndex < MAX_MESSAGE_LENGTH * 0.5) {
        // No good newline break, split at space
        splitIndex = remaining.lastIndexOf(' ', MAX_MESSAGE_LENGTH);
      }
      if (splitIndex < MAX_MESSAGE_LENGTH * 0.5) {
        // No good space break, hard split
        splitIndex = MAX_MESSAGE_LENGTH;
      }

      parts.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex).trimStart();
    }

    return parts;
  }

  /**
   * Rate limit delay between messages.
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastSendTime;
    if (elapsed < RATE_LIMIT_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS - elapsed));
    }
    this.lastSendTime = Date.now();
  }

  /**
   * Remove expired confirmations.
   */
  private cleanupExpiredConfirmations(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, pending] of this.pendingConfirmations) {
      if (pending.expiresAt < now) {
        this.pendingConfirmations.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[Johnny5/Telegram] Cleaned ${cleaned} expired confirmations`);
    }
  }

  // --------------------------------------------------------------------------
  // Public Getters
  // --------------------------------------------------------------------------

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getPendingConfirmationsCount(): number {
    return this.pendingConfirmations.size;
  }

  /**
   * Register a callback for confirmation button presses.
   * The Opportunity Engine will set this to handle confirm/skip actions.
   */
  onConfirmation(callback: ConfirmationCallback): void {
    this.confirmationCallback = callback;
  }
}

// Singleton instance
export const telegramBot = new Johnny5TelegramBot();

export default telegramBot;
