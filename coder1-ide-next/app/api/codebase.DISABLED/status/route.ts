import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const wiki = getCodebaseWiki();
    
    // Get real status from the CodebaseWiki service
    const stats = await wiki.getStats();
    
    return NextResponse.json({
      success: true,
      indexing: {
        isIndexing: stats.isIndexing || false,
        lastIndexed: stats.lastIndexed,
        progress: stats.isIndexing ? 50 : 100, // Simplified progress
        filesProcessed: stats.files,
        totalFiles: stats.files
      },
      service: {
        status: 'healthy',
        version: '1.0.0-live',
        uptime: process.uptime() * 1000 // Real uptime in milliseconds
      }
    });
    
  } catch (error) {
    console.error('Failed to get codebase status:', error);
    
    // Return error response instead of mock data
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get codebase status',
        message: error instanceof Error ? error.message : 'Unknown error',
        indexing: {
          isIndexing: false,
          lastIndexed: null,
          progress: 0,
          filesProcessed: 0,
          totalFiles: 0
        },
        service: {
          status: 'error',
          version: '1.0.0-live',
          uptime: process.uptime() * 1000
        }
      },
      { status: 500 }
    );
  }
}