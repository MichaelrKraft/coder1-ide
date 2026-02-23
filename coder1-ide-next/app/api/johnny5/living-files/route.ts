import { NextResponse } from 'next/server';
import { statSync, existsSync } from 'fs';
import { join } from 'path';
import { LIVING_FILES, loadLivingFile } from '@/lib/living-files';
import { getUserLivingFilesDir } from '@/lib/data-paths';

// Disable Next.js GET route caching so files appear immediately after init
export const dynamic = 'force-dynamic';

/** Logical display order for the UI */
const DISPLAY_ORDER = [
  'SOUL.md',
  'IDENTITY.md',
  'USER.md',
  'MEMORY.md',
  'AGENTS.md',
  'HEARTBEAT.md',
  'BOOT.md',
  'TOOLS.md',
  'BOOTSTRAP.md',
];

/** Human-readable descriptions shown in the file list */
const FILE_DESCRIPTIONS: Record<string, string> = {
  'SOUL.md':      'Personality, values & core truths',
  'IDENTITY.md':  'Mission, constraints & objectives',
  'USER.md':      'Everything Johnny5 knows about you',
  'MEMORY.md':    'Persistent facts & project knowledge',
  'AGENTS.md':    'Crew/team persona definitions',
  'HEARTBEAT.md': 'Proactivity & health configuration',
  'BOOT.md':      'Startup sequence & initialization',
  'TOOLS.md':     'Available capabilities (auto-generated)',
  'BOOTSTRAP.md': 'Environment status (auto-generated)',
};

export async function GET() {
  try {
    const livingFilesDir = getUserLivingFilesDir('default');
    const dirExists = existsSync(livingFilesDir);

    console.log('[Living Files GET] Directory:', livingFilesDir);
    console.log('[Living Files GET] Directory exists:', dirExists);

    const files = DISPLAY_ORDER.map((filename) => {
      const config = LIVING_FILES.find(f => f.filename === filename);
      if (!config) return null;

      const filePath = join(livingFilesDir, filename);
      const fileExists = dirExists && existsSync(filePath);

      let content = '';
      let sizeBytes = 0;
      let lastModified: string | null = null;

      if (fileExists) {
        try {
          const stat = statSync(filePath);
          sizeBytes = stat.size;
          lastModified = stat.mtime.toISOString();
        } catch {
          // stat failed — file may be inaccessible
        }
        content = loadLivingFile(filename) ?? '';
      }

      return {
        filename,
        content,
        writeMode: config.writeMode,
        sizeBytes,
        lastModified,
        exists: fileExists,
        description: FILE_DESCRIPTIONS[filename] ?? config.description,
      };
    }).filter(Boolean);

    const existingCount = files.filter((f: { exists: boolean }) => f.exists).length;
    console.log('[Living Files GET] Files found:', existingCount, '/', files.length);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('[Living Files API] Failed to load living files:', error);
    return NextResponse.json(
      { error: 'Failed to load living files' },
      { status: 500 }
    );
  }
}
