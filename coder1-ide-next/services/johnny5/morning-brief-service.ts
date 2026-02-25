/**
 * Morning Brief Service
 *
 * Sends a daily 8 AM briefing via Telegram with:
 * - Real AI/tech news via Gemini Flash (no Trend Monitor dependency)
 * - Active tasks from the DB
 *
 * Enabled by: JOHNNY5_MORNING_BRIEF=true
 * Test via Telegram: /brief command
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '@/lib/johnny5-db';
import { logger } from '@/lib/logger';
import { IntervalRegistry } from '@/lib/interval-registry';

// ============================================================================
// Research prompt for Gemini
// ============================================================================

function buildResearchPrompt(): string {
  const date = new Date().toDateString();
  return `You are a research assistant. Today is ${date}.

Find the 3 most interesting AI and tech stories from the past 48 hours relevant to:
- Claude / Anthropic news
- AI coding tools and developer productivity
- SaaS founders and indie hackers
- Content creation with AI

For each story, provide:
- **Title** (concise, 1 line)
- **Why it matters** (1-2 sentences for a developer/founder audience)
- **Content idea it sparks** (one YouTube or Twitter/X idea)

Then suggest 2 original content ideas for a developer who covers AI tools, Claude Code, and building SaaS products.

Format as clean markdown. Be specific and concrete, not generic. Skip filler phrases.`;
}

// ============================================================================
// Brief composition
// ============================================================================

async function buildBrief(): Promise<string> {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // 1. Gemini research
  let researchSection = '_News research unavailable — GEMINI\\_API\\_KEY not set._';
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genai = new GoogleGenerativeAI(apiKey);
      const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(buildResearchPrompt());
      researchSection = result.response.text().trim();
    } catch (error) {
      logger.error('[MorningBrief] Gemini research failed:', error);
      researchSection = '_News research failed — check logs._';
    }
  }

  // 2. Active tasks from DB
  let taskSection = '_No active tasks._';
  try {
    const db = getDb();
    const tasks = db.prepare(`
      SELECT title, status, priority
      FROM tasks
      WHERE status NOT IN ('done', 'completed', 'cancelled')
      ORDER BY
        CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT 5
    `).all() as Array<{ title: string; status: string; priority: string }>;

    if (tasks.length > 0) {
      taskSection = tasks
        .map(t => `• [${t.priority || 'normal'}] ${t.title}`)
        .join('\n');
    }
  } catch (error) {
    logger.warn('[MorningBrief] Could not fetch tasks:', error);
  }

  return [
    `🌅 *Good morning, Mike\\!*`,
    `*${date}*`,
    ``,
    `📰 *AI & TECH BRIEFING*`,
    researchSection,
    ``,
    `📋 *ACTIVE TASKS*`,
    taskSection,
    ``,
    `_Reply with /tasks for full task list or just chat\\._`,
  ].join('\n');
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Send the morning brief to the configured Telegram chat.
 * Safe to call at any time — used by the scheduler and the /brief command.
 */
export async function sendMorningBrief(): Promise<void> {
  // Import here to avoid circular dep — telegram-bot imports this file
  const { telegramBot } = await import('./telegram-bot');
  const { getJohnny5Config } = await import('@/lib/johnny5-config');

  const config = getJohnny5Config();
  const chatId = config.integrations?.telegram?.chatId;

  if (!chatId) {
    logger.warn('[MorningBrief] No Telegram chatId configured — skipping brief');
    return;
  }

  if (!telegramBot.getIsConnected()) {
    logger.warn('[MorningBrief] Telegram bot not connected — skipping brief');
    return;
  }

  logger.info('[MorningBrief] Building brief...');

  try {
    const brief = await buildBrief();
    await telegramBot.sendMessage(chatId, brief, 'Markdown');
    logger.info('[MorningBrief] Brief sent successfully');
  } catch (error) {
    logger.error('[MorningBrief] Failed to send brief:', error);
    try {
      const { telegramBot: bot } = await import('./telegram-bot');
      await bot.sendMessage(chatId, '⚠️ Morning brief failed to generate\\. Check server logs\\.', 'Markdown');
    } catch {
      // Best effort
    }
  }
}

/**
 * Schedule the morning brief at 8 AM local time.
 * Returns a cleanup function that cancels the schedule.
 * Call once from server.js after the Telegram bot starts.
 */
export function scheduleMorningBrief(): () => void {
  function msUntil8AM(): number {
    const now = new Date();
    const target = new Date(now);
    target.setHours(8, 0, 0, 0);
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime() - now.getTime();
  }

  let dailyInterval: NodeJS.Timeout | null = null;

  const msToFirst = msUntil8AM();
  logger.info(`[MorningBrief] Scheduled — first brief in ${Math.round(msToFirst / 60000)} minutes`);

  const initialTimer = setTimeout(() => {
    sendMorningBrief();
    dailyInterval = setInterval(sendMorningBrief, 24 * 60 * 60 * 1000);
    IntervalRegistry.register('johnny5:morning-brief', dailyInterval);
  }, msToFirst);

  return () => {
    clearTimeout(initialTimer);
    if (dailyInterval) clearInterval(dailyInterval);
  };
}
