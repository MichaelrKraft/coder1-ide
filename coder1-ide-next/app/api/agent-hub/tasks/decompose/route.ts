import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export const dynamic = 'force-dynamic';

interface ProposedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

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

  const { prdText, agentId } = body;

  if (!prdText || typeof prdText !== 'string') {
    return NextResponse.json({ error: 'prdText is required' }, { status: 400 });
  }
  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Break down the following product requirements document into a list of actionable engineering tasks.

Return ONLY a JSON array with no markdown, no explanation. Each item must have:
- "title": short imperative task title (max 80 chars)
- "description": 1-2 sentence description of what needs to be done
- "priority": one of "low", "medium", or "high"

PRD:
${prdText}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected AI response format' }, { status: 500 });
    }

    let tasks: ProposedTask[];
    try {
      tasks = JSON.parse(content.text) as ProposedTask[];
      if (!Array.isArray(tasks)) throw new Error('Not an array');
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as task list' },
        { status: 500 }
      );
    }

    // Validate and sanitize each task
    const sanitized: ProposedTask[] = tasks
      .filter((t) => t && typeof t.title === 'string' && t.title.length > 0)
      .map((t) => ({
        title: String(t.title).slice(0, 80),
        description: typeof t.description === 'string' ? t.description : '',
        priority:
          ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
      }));

    return NextResponse.json({ tasks: sanitized });
  } catch (error) {
    console.error('[agent-hub] POST /tasks/decompose error:', error);
    return NextResponse.json({ error: 'Failed to decompose PRD' }, { status: 500 });
  }
}
