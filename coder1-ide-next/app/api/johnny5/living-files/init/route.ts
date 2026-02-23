import { NextResponse } from 'next/server';
import { initializeLivingFiles } from '@/lib/living-files';
import { getDataPathDiagnostics } from '@/lib/data-paths';

export async function POST() {
  try {
    const diagnostics = getDataPathDiagnostics();
    console.log('[Living Files Init API] Starting initialization:', JSON.stringify(diagnostics));

    initializeLivingFiles(undefined, 'default');

    console.log('[Living Files Init API] Initialization completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Living Files Init API] Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize living files' },
      { status: 500 }
    );
  }
}
