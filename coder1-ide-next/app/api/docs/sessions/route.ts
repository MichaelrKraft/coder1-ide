import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SUMMARIES_DIR = '/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/summaries';

export async function GET(request: NextRequest) {
  try {
    // Check if summaries directory exists
    try {
      await fs.access(SUMMARIES_DIR);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(SUMMARIES_DIR, { recursive: true });
      return NextResponse.json({
        success: true,
        summaries: [],
        count: 0
      });
    }

    // Read all files in the summaries directory
    const files = await fs.readdir(SUMMARIES_DIR);
    
    // Filter for markdown files
    const summaryFiles = files.filter(file => file.endsWith('.md'));
    
    const summaries = [];
    
    for (const file of summaryFiles) {
      const filePath = path.join(SUMMARIES_DIR, file);
      
      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extract timestamp from filename (format: summary-TIMESTAMP.md)
        const timestampMatch = file.match(/summary-(\d+)\.md/);
        const timestamp = timestampMatch ? new Date(parseInt(timestampMatch[1])) : stats.mtime;
        
        // Extract title from first heading or use filename
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : `Session ${timestamp.toLocaleDateString()}`;
        
        // Extract preview (first non-heading paragraph)
        const lines = content.split('\n');
        let preview = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---') && trimmed.length > 10) {
            preview = trimmed.substring(0, 200) + (trimmed.length > 200 ? '...' : '');
            break;
          }
        }
        
        summaries.push({
          id: file.replace('.md', ''),
          filename: file,
          timestamp: timestamp.toISOString(),
          title,
          preview: preview || 'Session summary',
          size: stats.size,
          path: filePath
        });
      } catch (error) {
        // logger?.warn(`Failed to read summary file ${file}:`, error);
      }
    }
    
    // Sort by timestamp (newest first)
    summaries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return NextResponse.json({
      success: true,
      summaries,
      count: summaries.length
    });
  } catch (error: any) {
    // logger?.error('❌ [DOC-API] List session summaries failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list session summaries',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// GET specific session summary by ID
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const filename = id.endsWith('.md') ? id : `${id}.md`;
    const filePath = path.join(SUMMARIES_DIR, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: 'Session summary not found' },
        { status: 404 }
      );
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    // Extract timestamp
    const timestampMatch = filename.match(/summary-(\d+)\.md/);
    const timestamp = timestampMatch ? new Date(parseInt(timestampMatch[1])) : stats.mtime;
    
    // Extract title
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : `Session ${timestamp.toLocaleDateString()}`;
    
    return NextResponse.json({
      success: true,
      summary: {
        id,
        filename,
        title,
        content,
        timestamp: timestamp.toISOString(),
        size: stats.size,
        path: filePath
      }
    });
  } catch (error: any) {
    // logger?.error('❌ [DOC-API] Read session summary failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to read session summary',
        message: error.message 
      },
      { status: 500 }
    );
  }
}