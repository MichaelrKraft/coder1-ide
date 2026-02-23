import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { initializeLivingFiles, LIVING_FILES } from '@/lib/living-files';
import { getDataPathDiagnostics, getUserLivingFilesDir } from '@/lib/data-paths';

export async function POST() {
  try {
    const diagnostics = getDataPathDiagnostics();
    const livingFilesDir = getUserLivingFilesDir('default');

    console.log('[Living Files Init API] Starting initialization');
    console.log('[Living Files Init API] Data dir:', diagnostics.dataDir);
    console.log('[Living Files Init API] Living files dir:', livingFilesDir);
    console.log('[Living Files Init API] Dir exists before init:', existsSync(livingFilesDir));

    initializeLivingFiles(undefined, 'default');

    // Verify files were actually created
    const dirExistsAfter = existsSync(livingFilesDir);
    const filesCreated: string[] = [];
    const filesMissing: string[] = [];

    for (const file of LIVING_FILES) {
      const filePath = join(livingFilesDir, file.filename);
      if (existsSync(filePath)) {
        filesCreated.push(file.filename);
      } else {
        filesMissing.push(file.filename);
      }
    }

    console.log('[Living Files Init API] Dir exists after init:', dirExistsAfter);
    console.log('[Living Files Init API] Files created:', filesCreated.length);
    console.log('[Living Files Init API] Files missing:', filesMissing);

    if (filesMissing.length > 0) {
      console.error('[Living Files Init API] WARNING: Some files were not created!');
    }

    return NextResponse.json({
      success: true,
      dataDir: diagnostics.dataDir,
      livingFilesDir,
      filesCreated: filesCreated.length,
      filesMissing
    });
  } catch (error) {
    console.error('[Living Files Init API] Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize living files' },
      { status: 500 }
    );
  }
}
