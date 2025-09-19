import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.join(process.cwd(), '..');

// List of markdown files to include
const PROJECT_DOCS = [
  'ARCHITECTURE.md',
  'CLAUDE.md',
  'CONTEXT_FOLDERS_MEMORY_SYSTEM.md',
  'FUTURE_FEATURES_WORKFLOWS.md',
  'MAGIC_UI_STUDIO_TESTING_REPORT.md',
  'README.md',
  'REPOSITORY_STATUS.md',
  'AI_MASTERMIND_BIBLE.md',
  'MASTER_CONTEXT.md',
  'TEST_RESULTS.md'
];

export async function GET(request: NextRequest) {
  try {
    const docs = [];
    
    for (const docName of PROJECT_DOCS) {
      const docPath = path.join(PROJECT_ROOT, docName);
      
      try {
        const stats = await fs.stat(docPath);
        const content = await fs.readFile(docPath, 'utf-8');
        
        // Extract first meaningful line as preview (skip empty lines and headers)
        const lines = content.split('\n');
        let preview = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.length > 10) {
            preview = trimmed.substring(0, 150) + (trimmed.length > 150 ? '...' : '');
            break;
          }
        }
        
        docs.push({
          name: docName,
          path: docPath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          preview: preview || 'Documentation file',
          content: content
        });
      } catch (error) {
        // File doesn't exist, skip it
        // REMOVED: // REMOVED: console.log(`Skipping ${docName}: not found`);
      }
    }
    
    // Sort by modification time (newest first)
    docs.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    return NextResponse.json({
      success: true,
      docs,
      count: docs.length
    });
  } catch (error: any) {
    // logger?.error('❌ [DOC-API] List project docs failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list project documentation',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// GET specific document by name
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name || !PROJECT_DOCS.includes(name)) {
      return NextResponse.json(
        { error: 'Invalid document name' },
        { status: 400 }
      );
    }
    
    const docPath = path.join(PROJECT_ROOT, name);
    const content = await fs.readFile(docPath, 'utf-8');
    const stats = await fs.stat(docPath);
    
    return NextResponse.json({
      success: true,
      document: {
        name,
        path: docPath,
        content,
        size: stats.size,
        modified: stats.mtime.toISOString()
      }
    });
  } catch (error: any) {
    // logger?.error('❌ [DOC-API] Read project doc failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to read project documentation',
        message: error.message 
      },
      { status: 500 }
    );
  }
}