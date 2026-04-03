import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';
import { getAgent, getAgentRawTelegramToken } from '@/lib/agent-hub/agents';
import { testTelegramConnection } from '@/lib/agent-hub/telegram';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const agent = getAgent(id, userId);
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const token = getAgentRawTelegramToken(id, userId);
  if (!token || !agent.telegramChatId) {
    return NextResponse.json({ error: 'Telegram not configured for this agent' }, { status: 400 });
  }

  const result = await testTelegramConnection(token, agent.telegramChatId, agent.name);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
