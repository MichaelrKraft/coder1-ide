import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const memoryDir = path.join(process.cwd(), 'data', 'memory', 'sessions');
    const indexPath = path.join(memoryDir, 'index.json');
    
    // Read index file
    let index = [];
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(indexContent);
    } catch (error) {
      // No sessions yet
      return NextResponse.json([]);
    }
    
    // Load the requested number of recent sessions
    const recentSessions = [];
    const sessionFiles = index.slice(0, limit);
    
    for (const sessionMeta of sessionFiles) {
      try {
        const sessionPath = path.join(memoryDir, sessionMeta.filename);
        const sessionContent = await fs.readFile(sessionPath, 'utf-8');
        const session = JSON.parse(sessionContent);
        recentSessions.push(session);
      } catch (error) {
        console.warn(`Failed to load session ${sessionMeta.filename}:`, error);
      }
    }
    
    return NextResponse.json(recentSessions);
  } catch (error) {
    console.error('Error loading recent sessions:', error);
    return NextResponse.json(
      { error: 'Failed to load recent sessions' },
      { status: 500 }
    );
  }
}