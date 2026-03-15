import { NextRequest, NextResponse } from 'next/server';
import { assertLocalOnly } from '@/lib/vault-security';
import { featureFlags } from '@/config/feature-flags';

// POST /api/vault/miracles
// body: { miracle: 'dream-weaver' | 'idea-collision' | 'decay-radar', notePath?: string, noteContent?: string, noteTitle?: string }
export async function POST(req: NextRequest) {
  try {
    assertLocalOnly();
    if (!featureFlags.isEnabled('VAULT_ENABLED')) {
      return NextResponse.json({ error: 'Vault feature is not enabled' }, { status: 403 });
    }

    const body = await req.json();
    const { miracle } = body;

    if (!miracle) {
      return NextResponse.json({ error: 'miracle is required' }, { status: 400 });
    }

    switch (miracle) {
      case 'dream-weaver': {
        const { DreamWeaverService } = await import('@/services/DreamWeaverService');
        const result = await DreamWeaverService.run();
        return NextResponse.json(result);
      }

      case 'idea-collision': {
        const { notePath, noteContent, noteTitle, noteTags } = body;
        if (!notePath || !noteContent) {
          return NextResponse.json({ error: 'notePath and noteContent required for idea-collision' }, { status: 400 });
        }
        const { IdeaCollisionService } = await import('@/services/IdeaCollisionService');
        const result = await IdeaCollisionService.analyze(notePath, noteContent, noteTitle || notePath);
        return NextResponse.json(result || { error: 'Analysis failed or timed out' });
      }

      case 'decay-radar': {
        const { projectRoot } = body;
        const { DecayRadarService } = await import('@/services/DecayRadarService');
        const result = await DecayRadarService.run(projectRoot);
        return NextResponse.json(result);
      }

      case 'living-map-orphans': {
        const { LivingArchitectureMap } = await import('@/services/LivingArchitectureMap');
        const nudges = await LivingArchitectureMap.checkForOrphans();
        return NextResponse.json({ nudges });
      }

      case 'living-map-nudges': {
        const { LivingArchitectureMap } = await import('@/services/LivingArchitectureMap');
        return NextResponse.json({ nudges: LivingArchitectureMap.getRecentNudges() });
      }

      default:
        return NextResponse.json({ error: `Unknown miracle: ${miracle}` }, { status: 400 });
    }
  } catch (err) {
    console.error('[vault/miracles POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
