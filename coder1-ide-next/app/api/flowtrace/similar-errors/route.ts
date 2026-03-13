/**
 * POST /api/flowtrace/similar-errors
 *
 * Given an error string, finds semantically similar errors in FlowTrace history
 * and cross-references with commit_contexts to surface the commit where the error
 * was fixed.
 *
 * Returns gracefully empty results if FlowTrace is not configured or has no data.
 */

import { NextRequest } from 'next/server';
import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'db', 'context-memory.db');
const ONE_HOUR_MS = 3_600_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errorText } = body;

    if (!errorText || typeof errorText !== 'string' || errorText.trim().length === 0) {
      return Response.json({ error: 'errorText is required' }, { status: 400 });
    }

    // Feature guard — return empty matches when FlowTrace is off or unconfigured
    if (process.env.FLOWTRACE_ENABLED !== 'true' || !process.env.GEMINI_API_KEY) {
      return Response.json({ matches: [] });
    }

    // 1. Embed the error text and find semantically similar frames
    const { embedQuery } = await import('@/services/flowtrace/embedding-service');
    const { queryFrames } = await import('@/services/flowtrace/pinecone-service');

    const embedding = await embedQuery(errorText.slice(0, 500));
    const frames = await queryFrames(embedding, {
      topK: 5,
      contentTypes: ['terminal', 'code'],
    });

    if (frames.length === 0) {
      return Response.json({ matches: [] });
    }

    // 2. Cross-reference with commit_contexts via session time window
    let db: InstanceType<typeof Database> | null = null;
    try {
      db = new Database(DB_PATH, { readonly: true });
    } catch {
      // DB not yet created — FlowTrace has never captured anything
      return Response.json({ matches: [] });
    }

    interface CommitRow {
      commit_sha: string;
      commit_message: string | null;
      created_at: string;
    }

    interface ResultItem {
      commitSha: string;
      shortSha: string;
      commitMessage: string;
      timestamp: number;
      score: number;
    }

    const results: ResultItem[] = [];
    const seenShas = new Set<string>();

    for (const frame of frames) {
      const frameMs = frame.metadata.timestamp * 1000;
      const windowStart = new Date(frameMs - ONE_HOUR_MS).toISOString();
      const windowEnd = new Date(frameMs + ONE_HOUR_MS).toISOString();

      const rows = db.prepare(`
        SELECT DISTINCT cc.commit_sha, cc.commit_message, cc.created_at
        FROM commit_contexts cc
        WHERE cc.session_id IN (
          SELECT DISTINCT cp.session_id
          FROM checkpoints cp
          WHERE cp.created_at BETWEEN ? AND ?
        )
        ORDER BY cc.created_at DESC
        LIMIT 2
      `).all(windowStart, windowEnd) as CommitRow[];

      for (const row of rows) {
        if (!seenShas.has(row.commit_sha)) {
          seenShas.add(row.commit_sha);
          results.push({
            commitSha: row.commit_sha,
            shortSha: row.commit_sha.slice(0, 7),
            commitMessage: row.commit_message ?? '',
            timestamp: new Date(row.created_at).getTime(),
            score: frame.score,
          });
        }
      }
    }

    db.close();

    results.sort((a, b) => b.score - a.score);
    return Response.json({ matches: results.slice(0, 3) });
  } catch (err) {
    // Non-fatal — ErrorDoctor still works without FlowTrace
    console.error('[FlowTrace] similar-errors error:', err);
    return Response.json({ matches: [] });
  }
}
