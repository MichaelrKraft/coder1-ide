import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await request.json();
    
    // Create memory directory if it doesn't exist
    const memoryDir = path.join(process.cwd(), 'data', 'memory', 'sessions');
    await fs.mkdir(memoryDir, { recursive: true });
    
    // Generate filename from session timestamp
    const timestamp = new Date(session.startTime).toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.json`;
    const filepath = path.join(memoryDir, filename);
    
    // Save session to file
    await fs.writeFile(filepath, JSON.stringify(session, null, 2));
    
    // Update index file
    const indexPath = path.join(memoryDir, 'index.json');
    let index = [];
    
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(indexContent);
    } catch (error) {
      // Index doesn't exist yet, start with empty array
    }
    
    // Add session metadata to index
    index.unshift({
      sessionId: session.sessionId,
      filename,
      startTime: session.startTime,
      endTime: session.endTime,
      platform: session.platform,
      totalTokens: session.totalTokens,
      interactionCount: session.interactions?.length || 0,
      summary: session.summary
    });
    
    // Keep only last 100 sessions in index
    if (index.length > 100) {
      index = index.slice(0, 100);
    }
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      filename,
      message: 'Session saved successfully' 
    });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    );
  }
}