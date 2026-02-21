import { NextResponse } from 'next/server';
import { initializeLivingFiles } from '@/lib/living-files';

export async function POST() {
  try {
    initializeLivingFiles(undefined, 'default');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Living Files Init API] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to initialize living files' },
      { status: 500 }
    );
  }
}
