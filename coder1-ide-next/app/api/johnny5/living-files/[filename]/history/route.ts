import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { LIVING_FILES } from '@/lib/living-files';
import { getUserLivingFilesHistoryDir } from '@/lib/data-paths';

const ALLOWED_FILENAMES = new Set(LIVING_FILES.map(f => f.filename));

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!ALLOWED_FILENAMES.has(filename)) {
      return NextResponse.json({ error: 'Unknown file' }, { status: 403 });
    }

    const historyDir = getUserLivingFilesHistoryDir('default');

    if (!existsSync(historyDir)) {
      return NextResponse.json({ snapshots: [] });
    }

    const prefix = `${filename}.`;
    const allFiles = readdirSync(historyDir);
    const snapshots = allFiles
      .filter(f => f.startsWith(prefix) && f.endsWith('.bak'))
      .map(f => {
        const filePath = join(historyDir, f);
        try {
          const stat = statSync(filePath);
          return {
            filename: f,
            timestamp: stat.mtime.toISOString(),
            sizeBytes: stat.size,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.timestamp > a!.timestamp ? 1 : -1)); // Newest first

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('[Living Files History API] Failed:', error);
    return NextResponse.json({ snapshots: [] });
  }
}

/** Read the content of a specific snapshot */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!ALLOWED_FILENAMES.has(filename)) {
      return NextResponse.json({ error: 'Unknown file' }, { status: 403 });
    }

    const body = await request.json();
    const { snapshotFilename } = body as { snapshotFilename?: string };

    if (!snapshotFilename || !snapshotFilename.endsWith('.bak')) {
      return NextResponse.json({ error: 'Invalid snapshot filename' }, { status: 400 });
    }

    // Security: snapshot must start with the expected prefix
    if (!snapshotFilename.startsWith(`${filename}.`)) {
      return NextResponse.json({ error: 'Snapshot does not match file' }, { status: 403 });
    }

    const historyDir = getUserLivingFilesHistoryDir('default');
    const snapshotPath = join(historyDir, snapshotFilename);

    if (!existsSync(snapshotPath)) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    const content = readFileSync(snapshotPath, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
    console.error('[Living Files History API] POST failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
