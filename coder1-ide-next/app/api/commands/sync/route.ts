import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { teamAssetsService } from '@/services/team-assets-service';
import type { SlashCommandAssetData } from '@/types/slash-command';

export const dynamic = 'force-dynamic';

/**
 * POST /api/commands/sync?teamId=<id>
 *
 * Fetches all team slash commands and writes them to ~/.claude/commands/team/<slug>.md.
 * Returns a summary of installed, skipped, and errored commands.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  const installed: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  try {
    const assets = await teamAssetsService.list<SlashCommandAssetData>(teamId, 'slash_command');

    // Ensure ~/.claude/commands/team/ directory exists
    const teamCommandsDir = path.join(os.homedir(), '.claude', 'commands', 'team');
    fs.mkdirSync(teamCommandsDir, { recursive: true });

    for (const asset of assets) {
      const { slug, content } = asset.data;

      if (!slug || !content) {
        skipped.push(slug ?? asset.assetKey);
        continue;
      }

      const filePath = path.join(teamCommandsDir, `${slug}.md`);

      try {
        fs.writeFileSync(filePath, content, 'utf-8');
        installed.push(slug);
      } catch (writeErr) {
        const message = writeErr instanceof Error ? writeErr.message : String(writeErr);
        errors.push(`${slug}: ${message}`);
      }
    }

    return NextResponse.json({ installed, skipped, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/commands/sync POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
