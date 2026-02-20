import { NextRequest, NextResponse } from 'next/server';
import type { FileConflict } from '@/types/vcs';

/**
 * GET /api/vcs/team/:teamId/conflicts
 *
 * Returns the current conflict state for a team.
 * Conflicts are tracked in-memory on the server via Socket.IO events,
 * but this REST endpoint provides a way to fetch state on initial load
 * or when WebSocket reconnects.
 *
 * Note: The actual conflict data lives in global._vcsActiveFiles on the
 * server.js process. Since Next.js API routes run in a separate context,
 * this route reads from the same global if running in custom server mode,
 * or returns an empty state (clients then use WebSocket for real-time data).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      );
    }

    // Access the in-memory conflict tracking from server.js
    // This works because server.js stores it on global._vcsActiveFiles
    const vcsActiveFiles = (global as Record<string, unknown>)._vcsActiveFiles as
      Map<string, Map<string, Map<string, { username: string; branch: string; since: string }>>> | undefined;

    if (!vcsActiveFiles) {
      // Server hasn't initialized VCS tracking yet, or running in standalone mode
      return NextResponse.json({
        conflicts: [],
        activeEditors: [],
        teamId,
      });
    }

    const teamFiles = vcsActiveFiles.get(teamId);
    if (!teamFiles) {
      return NextResponse.json({
        conflicts: [],
        activeEditors: [],
        teamId,
      });
    }

    const conflicts: FileConflict[] = [];
    const activeEditors: Array<{
      userId: string;
      username: string;
      filePath: string;
      branch: string;
      since: string;
    }> = [];

    for (const [filePath, fileEditors] of teamFiles) {
      // Build active editors list
      for (const [userId, info] of fileEditors) {
        activeEditors.push({
          userId,
          username: info.username,
          filePath,
          branch: info.branch,
          since: info.since,
        });
      }

      // Build conflicts (files with multiple editors)
      if (fileEditors.size > 1) {
        const editors: FileConflict['editors'] = [];
        for (const [userId, info] of fileEditors) {
          editors.push({
            userId,
            username: info.username,
            branch: info.branch,
            since: info.since,
          });
        }
        conflicts.push({
          filePath,
          editors,
          severity: 'critical',
          detectedAt: editors[0].since,
        });
      }
    }

    return NextResponse.json({
      conflicts,
      activeEditors,
      teamId,
    });
  } catch (error) {
    console.error('[VCS] Error fetching conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conflicts' },
      { status: 500 }
    );
  }
}
