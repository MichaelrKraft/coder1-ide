import { NextRequest, NextResponse } from 'next/server';
import { getVaultService } from '@/lib/vault-service';
import { assertLocalOnly } from '@/lib/vault-security';
import { featureFlags } from '@/config/feature-flags';
import { VaultNoteStub } from '@/lib/vault-types';
import Anthropic from '@anthropic-ai/sdk';

function guardVault() {
  assertLocalOnly();
  if (!featureFlags.isEnabled('VAULT_ENABLED')) {
    return NextResponse.json({ error: 'Vault feature is not enabled' }, { status: 403 });
  }
  return null;
}

// POST /api/vault/semantic-search
// Body: { query: string; topK?: number }
// Response: { results: Array<VaultNoteStub & { matchReason: string }> }
export async function POST(req: NextRequest) {
  let candidates: VaultNoteStub[] = [];
  let topK = 8;

  try {
    const guard = guardVault();
    if (guard) return guard;

    const body = await req.json().catch(() => ({}));
    if (!body.query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const query = body.query as string;
    topK = body.topK ?? 8;
    const vault = getVaultService();

    // Stage 1: FTS keyword search
    const ftsResults = vault.search(query, 20);
    candidates = ftsResults.map((r) => r.note);

    // Pad with recent notes if fewer than 5 FTS results
    if (candidates.length < 5) {
      const recent = vault.listNotes(undefined, 20);
      const seen = new Set(candidates.map((n) => n.path));
      for (const note of recent) {
        if (!seen.has(note.path)) {
          candidates.push(note);
          seen.add(note.path);
        }
        if (candidates.length >= 20) break;
      }
    }

    const candidateList = candidates
      .map((n, i) => `${i + 1}. "${n.title}" (${n.path})${n.excerpt ? ` — ${n.excerpt.slice(0, 100)}` : ''}`)
      .join('\n');

    const prompt =
      `You are a semantic search engine for a developer knowledge base. Given a query, rank the most relevant notes.\n\nQuery: "${query}"\n\nCandidates:\n${candidateList}\n\nReturn ONLY a JSON array of the top ${topK} most relevant items: [{"path":"...","matchReason":"one sentence why this matches"}]. No other text.`;

    try {
      const anthropic = new Anthropic();
      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = (message.content[0] as { type: 'text'; text: string }).text;
      const match = responseText.match(/\[[\s\S]*\]/);
      const ranked: Array<{ path: string; matchReason: string }> = match ? JSON.parse(match[0]) : [];

      const candidateMap = new Map(candidates.map((n) => [n.path, n]));
      const results = ranked
        .filter((r) => candidateMap.has(r.path))
        .map((r) => ({ ...candidateMap.get(r.path)!, matchReason: r.matchReason }));

      return NextResponse.json({ results });
    } catch (aiErr) {
      console.error('[vault/semantic-search] AI call failed, falling back to FTS', aiErr);
      // Fallback to FTS results
      const results = candidates
        .slice(0, topK)
        .map((n) => ({ ...n, matchReason: 'Keyword match' }));
      return NextResponse.json({ results });
    }
  } catch (err) {
    console.error('[vault/semantic-search]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
