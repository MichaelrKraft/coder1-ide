import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, role, description } = body;

  if (!role || typeof role !== 'string') {
    return NextResponse.json({ error: 'role is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }

  try {
    const client = new Anthropic({ apiKey });

    const userMessage = [
      `Generate a Claude Code system prompt for an agent with the following details:`,
      `Name: ${typeof name === 'string' ? name : 'Agent'}`,
      `Role: ${role}`,
      description ? `Description: ${description}` : '',
      '',
      `The system prompt should:`,
      `- Define the agent's core responsibilities and expertise`,
      `- Specify coding standards and practices to follow`,
      `- Set clear boundaries for what the agent should and should not do`,
      `- Be concise (200-400 words)`,
      `- Be written in second person ("You are...")`,
    ]
      .filter(Boolean)
      .join('\n');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response from AI' }, { status: 500 });
    }

    return NextResponse.json({ systemPrompt: content.text });
  } catch (error) {
    console.error('[agent-hub] generate-prompt error:', error);
    return NextResponse.json({ error: 'Failed to generate system prompt' }, { status: 500 });
  }
}
