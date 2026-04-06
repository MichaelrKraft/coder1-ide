import { NextRequest, NextResponse } from 'next/server';
import { getRun } from '@/lib/agent-hub/runs';
import { getAgent, getAgentRawTelegramToken } from '@/lib/agent-hub/agents';
import { getTask } from '@/lib/agent-hub/tasks';
import { sendAgentNotification } from '@/lib/agent-hub/telegram';

/**
 * Internal webhook called by server.js after run status changes.
 * Sends per-agent Telegram notifications based on run status.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Auth: require internal token if configured
  const token = request.headers.get('x-internal-token');
  const expectedToken = process.env.AGENT_HUB_INTERNAL_TOKEN;
  if (expectedToken && token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const run = getRun(id, 'default');
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const agent = getAgent(run.agentId, run.userId);
  const task = getTask(run.taskId, run.userId);
  if (!agent || !task || !agent.telegramChatId) {
    return NextResponse.json({ skipped: true });
  }

  const rawToken = getAgentRawTelegramToken(agent.id, run.userId);
  if (!rawToken) return NextResponse.json({ skipped: true });

  let message = '';
  switch (run.status) {
    case 'awaiting_approval':
      message = `Task *${task.title}* is ready for review.`;
      break;
    case 'failed':
      message = `Task *${task.title}* failed: ${run.errorSummary ?? 'Unknown error'}`;
      break;
    default:
      return NextResponse.json({ skipped: true });
  }

  const sent = await sendAgentNotification(rawToken, agent.telegramChatId, message);
  return NextResponse.json({ sent });
}
