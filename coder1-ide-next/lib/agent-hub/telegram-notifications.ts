async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.debug('[telegram-notifications] TELEGRAM_BOT_TOKEN/CHAT_ID not set, skipping');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!response.ok) {
      console.warn(`[telegram-notifications] sendMessage failed: ${response.status}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[telegram-notifications] fetch error: ${message}`);
  }
}

export async function notifyRunComplete(
  agentName: string,
  taskTitle: string,
  runId: string
): Promise<void> {
  const text =
    `Agent [${agentName}] finished [${taskTitle}]. ` +
    `Review changes in Coder1 Agent Hub. (Run ${runId})`;
  await sendTelegramMessage(text);
}

export async function notifyRunFailed(
  agentName: string,
  taskTitle: string,
  errorSummary: string
): Promise<void> {
  const text =
    `Agent [${agentName}] failed on [${taskTitle}]. Error: ${errorSummary}`;
  await sendTelegramMessage(text);
}
