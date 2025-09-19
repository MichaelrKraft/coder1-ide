import { NextResponse } from 'next/server';
import path from 'path';

// Import the CodebaseWiki service from src/services
const CodebaseWiki = require('../../../../../src/services/codebase-wiki.js');

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

export async function GET() {
  try {
    const wiki = getCodebaseWiki();
    
    // Get real stats from the CodebaseWiki service
    const stats = await wiki.getStats();
    
    return NextResponse.json({
      success: true,
      ...stats,
      server: 'unified-server'
    });
    
  } catch (error) {
    console.error('Failed to get codebase stats:', error);
    
    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get codebase statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}