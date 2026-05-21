/**
 * Telegram polling infrastructure for per-agent bot identities.
 * Uses setInterval(500) instead of webhooks — Render blocks webhook delivery.
 * All errors are caught; polling must never crash.
 */

import { parseTelegramCommand } from './telegram-commands';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    date: number; // Unix timestamp
  };
}

export class TelegramPoller {
  private botToken: string;
  private agentId: string;
  private lastUpdateId = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private serverStartTime: number;

  constructor(botToken: string, agentId: string, _userId: string) {
    this.botToken = botToken;
    this.agentId = agentId;
    // Skips updates replayed from before server start (Telegram replays 24h on offset=0)
    this.serverStartTime = Math.floor(Date.now() / 1000);
  }

  start(onUpdate: (update: TelegramUpdate) => Promise<void>): void {
    if (this.timer) return; // already running
    this.timer = setInterval(async () => {
      await this.poll(onUpdate);
    }, 500);
    console.log('[telegram] Poller started for agent', this.agentId);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[telegram] Poller stopped for agent', this.agentId);
    }
  }

  private async poll(onUpdate: (update: TelegramUpdate) => Promise<void>): Promise<void> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=0`;
      let response: Response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      } catch {
        return; // network error — silent retry next tick
      }

      if (response.status === 429) {
        await new Promise<void>(r => setTimeout(r, 1000));
        return;
      }

      if (!response.ok) return;

      const data = await response.json() as { ok: boolean; result: TelegramUpdate[] };
      if (!data.ok || !Array.isArray(data.result)) return;

      for (const update of data.result) {
        this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
        // Skip stale updates from before server start
        if (update.message && update.message.date < this.serverStartTime) continue;
        await onUpdate(update).catch(err => {
          console.error('[telegram] onUpdate error:', err);
        });
      }
    } catch (err) {
      console.error('[telegram] Poll error for agent', this.agentId, err);
    }
  }
}

export class TelegramPollerRegistry {
  private pollers = new Map<string, TelegramPoller>();

  register(agent: { id: string; userId: string; telegram_bot_token?: string | null }): void {
    // Stop existing poller for this agent (handles token rotation)
    this.unregister(agent.id);

    if (!agent.telegram_bot_token) return;

    const poller = new TelegramPoller(agent.telegram_bot_token, agent.id, agent.userId);
    poller.start(async (update) => {
      await handleTelegramUpdate(update, agent.id, agent.userId);
    });
    this.pollers.set(agent.id, poller);
  }

  unregister(agentId: string): void {
    const existing = this.pollers.get(agentId);
    if (existing) {
      existing.stop();
      this.pollers.delete(agentId);
    }
  }

  getAll(): Map<string, TelegramPoller> {
    return this.pollers;
  }
}

async function handleTelegramUpdate(
  update: TelegramUpdate,
  agentId: string,
  userId: string
): Promise<void> {
  const text = update.message?.text;
  if (!text) return;

  const command = parseTelegramCommand(text);
  if (!command) return;

  console.log('[telegram] Command received for agent', agentId, ':', command.type);

  // TODO (server.js wiring): emit 'telegram:command' event to userId room
  // with { agentId, command, chatId: update.message?.chat.id }
  void userId; // referenced via server.js wiring, not inline here
}
