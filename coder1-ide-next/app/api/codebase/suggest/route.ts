import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

// Import the CodebaseWiki service
const CodebaseWiki = require('@/services/codebase-wiki.js');

// Singleton instance of CodebaseWiki
let codebaseWiki: any = null;

function getCodebaseWiki() {
  if (!codebaseWiki) {
    const projectRoot = path.join(process.cwd(), '..');  // Go up to autonomous_vibe_interface
    codebaseWiki = new CodebaseWiki({
      projectRoot,
      logger: console
    });
    
    // Start initial indexing in the background
    codebaseWiki.indexCodebase().catch((err: any) => {
      console.error('Failed to index codebase:', err);
    });
  }
  return codebaseWiki;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '8');

  try {
    const wiki = getCodebaseWiki();
    
    // Use the real suggest method from CodebaseWiki service
    const suggestions = await wiki.suggest(query, { limit });
    
    return NextResponse.json({
      success: true,
      suggestions
    });
    
  } catch (error) {
    console.error('Failed to get codebase suggestions:', error);
    
    // Return error response instead of mock data
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestions: []
      },
      { status: 500 }
    );
  }
}