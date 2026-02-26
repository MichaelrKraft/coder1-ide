import { NextRequest, NextResponse } from 'next/server';
import { teamAssetsService } from '@/services/team-assets-service';
import type { SlashCommandAssetData, SlashCommandVersion } from '@/types/slash-command';

export const dynamic = 'force-dynamic';

/**
 * GET /api/commands/team/[slug]/history?teamId=<id>
 *
 * Returns the version history for a specific slash command.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const { slug } = params;
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }

  try {
    const asset = await teamAssetsService.getByKey<SlashCommandAssetData>(
      teamId,
      'slash_command',
      slug
    );

    if (!asset) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    const versions: SlashCommandVersion[] = asset.data.versions ?? [];
    return NextResponse.json({ versions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/commands/team/[slug]/history GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
