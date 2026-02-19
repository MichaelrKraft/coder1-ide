/**
 * POST /api/johnny5/self-audit/apply
 *
 * Applies a self-audit recommendation.
 * Supports:
 *   - update_living_file: appends content to a living file
 *   - adjust_pattern: boosts or decays a pattern's confidence
 */

import { NextRequest, NextResponse } from 'next/server';
import { appendToLivingFile } from '@/lib/living-files';
import { recordPatternApplication, decayStalePatterns } from '@/services/memory/pattern-detection-service';
import { extractUserId } from '@/lib/auth/extract-user-id';

// ============================================================================
// Types
// ============================================================================

interface ApplyLivingFilePayload {
  type: 'update_living_file';
  filename: string;
  content: string;
}

interface AdjustPatternPayload {
  type: 'adjust_pattern';
  action: 'boost' | 'decay';
  patternId?: string;
  description?: string;
}

type ApplyPayload = ApplyLivingFilePayload | AdjustPatternPayload;

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = extractUserId(request);
    const body = await request.json() as ApplyPayload;

    if (!body || !body.type) {
      return NextResponse.json(
        { error: 'Missing required field: type' },
        { status: 400 }
      );
    }

    switch (body.type) {
      case 'update_living_file': {
        const payload = body as ApplyLivingFilePayload;
        if (!payload.filename || !payload.content) {
          return NextResponse.json(
            { error: 'Missing required fields: filename, content' },
            { status: 400 }
          );
        }

        // Only allow known living files
        const allowedFiles = ['MEMORY.md', 'USER.md', 'HEARTBEAT.md', 'BOOT.md', 'AGENTS.md'];
        if (!allowedFiles.includes(payload.filename)) {
          return NextResponse.json(
            { error: `Cannot write to ${payload.filename}. Allowed files: ${allowedFiles.join(', ')}` },
            { status: 403 }
          );
        }

        const success = appendToLivingFile(payload.filename, payload.content, userId);
        if (!success) {
          return NextResponse.json(
            { error: `Failed to append to ${payload.filename}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Appended content to ${payload.filename}`,
        });
      }

      case 'adjust_pattern': {
        const payload = body as AdjustPatternPayload;

        if (payload.action === 'boost' && payload.patternId) {
          await recordPatternApplication(payload.patternId, userId);
          return NextResponse.json({
            success: true,
            message: `Boosted pattern ${payload.patternId}`,
          });
        }

        if (payload.action === 'decay') {
          const decayed = await decayStalePatterns(30, 0.1, userId);
          return NextResponse.json({
            success: true,
            message: `Decayed ${decayed} stale patterns`,
          });
        }

        return NextResponse.json(
          { error: 'Invalid adjust_pattern payload. Need action (boost/decay) and patternId for boost.' },
          { status: 400 }
        );
      }

      default:
        return NextResponse.json(
          { error: `Unknown recommendation type: ${(body as any).type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SelfAudit/Apply] Error:', error);
    return NextResponse.json(
      { error: 'Failed to apply recommendation.' },
      { status: 500 }
    );
  }
}
