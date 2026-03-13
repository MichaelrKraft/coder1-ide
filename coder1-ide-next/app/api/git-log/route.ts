import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { commitContextService } from '@/services/commit-context-service';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

export interface GitLogEntry {
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  message: string;
  contextStatus: 'done' | 'pending' | 'generating' | 'failed' | 'no_session' | 'none';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
  const repoPath = searchParams.get('repoPath') || process.cwd();

  try {
    const format = '%H%x1f%an%x1f%ai%x1f%s%x1e';
    const { stdout } = await execAsync(
      `git log --pretty=format:"${format}" -${limit}`,
      { cwd: repoPath, timeout: 10000 }
    );

    const entries: GitLogEntry[] = stdout
      .split('\x1e')
      .map(s => s.trim())
      .filter(Boolean)
      .map(entry => {
        const [sha, author, date, message] = entry.split('\x1f');
        return {
          sha: sha?.trim() ?? '',
          shortSha: (sha?.trim() ?? '').slice(0, 7),
          author: author?.trim() ?? '',
          date: date?.trim() ?? '',
          message: message?.trim() ?? '',
          contextStatus: 'none' as const,
        };
      })
      .filter(e => e.sha.length === 40);

    // Merge context badge data — match by full SHA or short SHA
    const contextShas = await commitContextService.listShas(500);
    const contextMap = new Map(contextShas.map(c => [c.commit_sha, c.summary_status]));
    const shortShaMap = new Map(contextShas.map(c => [c.commit_sha.slice(0, 7), c.summary_status]));

    for (const entry of entries) {
      const status = contextMap.get(entry.sha) ?? shortShaMap.get(entry.shortSha);
      if (status) {
        entry.contextStatus = status as GitLogEntry['contextStatus'];
      }
    }

    return NextResponse.json({ entries, total: entries.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as NodeJS.ErrnoException)?.code;
    if (message.includes('not a git repository') || code === 128) {
      return NextResponse.json({ entries: [], total: 0, warning: 'Not a git repository' });
    }
    console.error('[API] GET /api/git-log error:', err);
    return NextResponse.json({ error: 'Failed to parse git log' }, { status: 500 });
  }
}
