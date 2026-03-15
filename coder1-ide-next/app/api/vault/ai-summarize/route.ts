import { NextRequest, NextResponse } from 'next/server';
import { assertLocalOnly } from '@/lib/vault-security';
import { featureFlags } from '@/config/feature-flags';
import Anthropic from '@anthropic-ai/sdk';

function guardVault() {
  assertLocalOnly();
  if (!featureFlags.isEnabled('VAULT_ENABLED')) {
    return NextResponse.json({ error: 'Vault feature is not enabled' }, { status: 403 });
  }
  return null;
}

// POST /api/vault/ai-summarize
// Body: { path: string; content: string; title: string }
// Response: { summary: string }
export async function POST(req: NextRequest) {
  try {
    const guard = guardVault();
    if (guard) return guard;

    const body = await req.json().catch(() => ({}));
    if (!body.path || !body.content || !body.title) {
      return NextResponse.json({ error: 'path, content, and title are required' }, { status: 400 });
    }

    const anthropic = new Anthropic();
    const prompt =
      `You are summarizing a developer note for a knowledge base sidebar. Write exactly 2-3 sentences describing what this note covers. Be specific and technical. Only return the summary text, no labels or formatting.\n\nTitle: ${body.title}\n\n${(body.content as string).slice(0, 3000)}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = (message.content[0] as { type: 'text'; text: string }).text.trim();
    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[vault/ai-summarize]', err);
    return NextResponse.json({ summary: '' });
  }
}
