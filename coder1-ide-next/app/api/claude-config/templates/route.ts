import { NextResponse } from 'next/server';
import { templateLoader } from '@/lib/claude-config';

export async function GET() {
  try {
    const templates = await templateLoader.getTemplates();
    
    return NextResponse.json({
      success: true,
      templates,
      count: templates.length
    });
  } catch (error) {
    console.error('[Claude Config API] Failed to load templates:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load templates',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
