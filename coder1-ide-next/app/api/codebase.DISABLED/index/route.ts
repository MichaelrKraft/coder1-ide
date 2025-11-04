import { NextResponse } from 'next/server';
import path from 'path';
import { logger } from '@/lib/logger';

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
  }
  return codebaseWiki;
}

export async function POST() {
  try {
    const wiki = getCodebaseWiki();
    
    // Check if already indexing
    if (wiki.isIndexing) {
      return NextResponse.json({
        success: false,
        message: 'Indexing already in progress',
        isIndexing: true
      });
    }
    
    // Start indexing asynchronously
    wiki.indexCodebase().then(() => {
      // REMOVED: console.log('✅ Codebase indexing completed');
    }).catch((error: any) => {
      // // logger?.error('❌ Codebase indexing failed:', error);
    });
    
    // Return immediate response
    return NextResponse.json({
      success: true,
      message: 'Codebase indexing started',
      estimatedDuration: '10-30 seconds depending on codebase size',
      indexing: {
        isIndexing: true,
        startTime: new Date().toISOString(),
        progress: 0
      },
      server: 'unified-server'
    });
    
  } catch (error) {
    // logger?.error('Failed to start codebase indexing:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start codebase indexing',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}