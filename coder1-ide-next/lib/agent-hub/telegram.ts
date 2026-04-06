/**
 * Per-agent Telegram notifications.
 * Each agent has its own bot token from @BotFather.
 */

export async function sendAgentNotification(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  if (!botToken || !chatId) return false;
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    if (!res.ok) {
      console.warn(`[telegram] Send failed for chat ${chatId}: ${res.status}`);
    }
    return res.ok;
  } catch (err) {
    console.warn('[telegram] Send error:', err instanceof Error ? err.message : err);
    return false;
  }
}

export async function testTelegramConnection(
  botToken: string,
  chatId: string,
  agentName: string
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) return { success: false, error: 'Bot token and chat ID are required' };
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Hello from *${agentName}*! Telegram notifications are now connected.`,
        parse_mode: 'Markdown',
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { description?: string };
      return { success: false, error: body.description ?? `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}
