import { NextRequest, NextResponse } from 'next/server';
import { LIVING_FILES, writeLivingFile } from '@/lib/living-files';

/** Files that cannot be saved via the UI */
const BLOCKED_WRITE_MODES = new Set(['readonly', 'auto']);

/** Allowed filenames — strict allowlist to prevent path traversal */
const ALLOWED_FILENAMES = new Set(LIVING_FILES.map(f => f.filename));

/** Max content size: 200KB */
const MAX_CONTENT_BYTES = 200 * 1024;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Allowlist check — strict match only, prevents path traversal
    if (!ALLOWED_FILENAMES.has(filename)) {
      return NextResponse.json(
        { error: `Unknown file: ${filename}` },
        { status: 403 }
      );
    }

    const config = LIVING_FILES.find(f => f.filename === filename)!;

    // Block readonly and auto-generated files
    if (BLOCKED_WRITE_MODES.has(config.writeMode)) {
      return NextResponse.json(
        { error: `Cannot edit ${filename} — it is ${config.writeMode}` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body as { content?: string };

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      );
    }

    if (Buffer.byteLength(content, 'utf-8') > MAX_CONTENT_BYTES) {
      return NextResponse.json(
        { error: 'Content exceeds 200KB limit' },
        { status: 400 }
      );
    }

    const success = writeLivingFile(filename, content, 'replace', 'default');

    if (!success) {
      return NextResponse.json(
        { error: `Failed to write ${filename}` },
        { status: 500 }
      );
    }

    // Fire-and-forget re-index — updates memory search without blocking the response
    import('@/services/memory/sources/living-files-indexer')
      .then(({ indexLivingFile }) => indexLivingFile(filename, 'default'))
      .catch(err => console.warn('[Living Files API] Re-index failed:', (err as Error).message));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Living Files API] PUT failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
