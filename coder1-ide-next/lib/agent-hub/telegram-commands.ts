/**
 * Parses incoming Telegram message text into typed commands for agent-hub.
 */

export type TelegramCommand =
  | { type: 'standup' }
  | { type: 'discuss'; question: string }
  | { type: 'assign'; agentName: string; message: string }
  | { type: 'message'; text: string };

export function parseTelegramCommand(text: string): TelegramCommand | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  if (trimmed.toLowerCase() === '/standup') {
    return { type: 'standup' };
  }

  const discussMatch = trimmed.match(/^\/discuss\s+(.+)$/i);
  if (discussMatch) {
    return { type: 'discuss', question: discussMatch[1].trim() };
  }

  const assignMatch = trimmed.match(/^\/assign\s+(\S+)\s+(.+)$/i);
  if (assignMatch) {
    return { type: 'assign', agentName: assignMatch[1], message: assignMatch[2].trim() };
  }

  // Plain text — treat as a task/message to the agent
  if (trimmed.length > 0) {
    return { type: 'message', text: trimmed };
  }

  return null;
}
