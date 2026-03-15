import { NextRequest, NextResponse } from 'next/server';
import { getVaultService } from '@/lib/vault-service';
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

// POST /api/vault/suggest-links
// Body: { notePath: string; noteTitle: string; noteContent: string }
// Response: { suggestions: Array<{ path: string; title: string; reason: string }> }
export async function POST(req: NextRequest) {
  try {
    const guard = guardVault();
    if (guard) return guard;

    const body = await req.json().catch(() => ({}));
    if (!body.notePath || !body.noteTitle || !body.noteContent) {
      return NextResponse.json({ error: 'notePath, noteTitle, and noteContent are required' }, { status: 400 });
    }

    const vault = getVaultService();
    const allNotes = vault.listNotes(undefined, 20);
    const catalog = allNotes
      .filter((n) => n.path !== body.notePath)
      .slice(0, 20)
      .map((n) => `- "${n.title}" (${n.path})`)
      .join('\n');

    const prompt =
      `You are a knowledge base assistant. Given this note, suggest 2-3 existing notes it should link to.\n\nNote: "${body.noteTitle}"\nContent preview: ${(body.noteContent as string).slice(0, 500)}\n\nAvailable notes:\n${catalog}\n\nReturn ONLY a JSON array like: [{"path":"...","title":"...","reason":"one sentence why"}]. No other text.`;

    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = (message.content[0] as { type: 'text'; text: string }).text;
    const match = responseText.match(/\[[\s\S]*\]/);
    const suggestions = (match ? JSON.parse(match[0]) : []).slice(0, 3);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('[vault/suggest-links]', err);
    return NextResponse.json({ suggestions: [] });
  }
}
