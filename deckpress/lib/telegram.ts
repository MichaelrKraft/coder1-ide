/**
 * Telegram Bot API helpers.
 * Deckpress uses Telegram as the founder-facing interface for the investor
 * chat widget: the investor sends a message from the deck → it forwards to
 * Telegram → founder replies with `/reply {sessionId} {text}` → webhook
 * stores the reply in KV → investor widget polls and displays it.
 */

export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification');
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    if (!response.ok) {
      console.error('[telegram] sendMessage failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('[telegram] network error:', err);
  }
}

export function formatInvestorMessage(
  sessionId: string,
  token: string,
  message: string
): string {
  return (
    `🔔 *Deckpress message* from investor \`${token}\`\n\n` +
    `"${message}"\n\n` +
    `Reply with:\n\`/reply ${sessionId} your message here\``
  );
}

export function parseTelegramReply(
  text: string
): { sessionId: string; message: string } | null {
  const match = text.match(/^\/reply\s+(\S+)\s+([\s\S]+)$/);
  if (!match) return null;
  return { sessionId: match[1], message: match[2].trim() };
}
