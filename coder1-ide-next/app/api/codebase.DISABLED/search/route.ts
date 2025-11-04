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
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const wiki = getCodebaseWiki();
    
    // Perform real search using CodebaseWiki service
    const searchResults = await wiki.search(query, {
      limit,
      includeContext: true
    });
    
    // Format results for frontend
    const formattedResults = {
      files: searchResults.files || [],
      functions: searchResults.functions || [],
      classes: searchResults.classes || [],
      variables: searchResults.variables || []
    };
    
    const totalResults = 
      formattedResults.files.length + 
      formattedResults.functions.length + 
      formattedResults.classes.length + 
      formattedResults.variables.length;
    
    return NextResponse.json({
      success: true,
      results: formattedResults,
      totalResults,
      query,
      server: 'unified-server'
    });
    
  } catch (error) {
    console.error('Failed to search codebase:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search codebase',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}