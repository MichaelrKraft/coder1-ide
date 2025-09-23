import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const maxTokens = parseInt(searchParams.get('maxTokens') || '1000');
    
    const memoryDir = path.join(process.cwd(), 'data', 'memory', 'sessions');
    const indexPath = path.join(memoryDir, 'index.json');
    
    // Read index
    let index = [];
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(indexContent);
    } catch (error) {
      return NextResponse.json({
        recentSummary: '',
        relevantContext: [],
        totalTokens: 0,
        sessionCount: 0
      });
    }
    
    // Build context
    const context = {
      recentSummary: '',
      relevantContext: [] as string[],
      totalTokens: 0,
      sessionCount: 0
    };
    
    // Get most recent session summary
    if (index.length > 0) {
      const recentMeta = index[0];
      context.recentSummary = recentMeta.summary || 
        `Recent ${recentMeta.platform} session: ${recentMeta.interactionCount} interactions`;
      context.totalTokens += Math.ceil(context.recentSummary.length / 4);
    }
    
    // Find relevant sessions based on query
    const relevantSessions = query 
      ? index.filter(session => 
          session.summary?.toLowerCase().includes(query.toLowerCase()) ||
          session.platform?.toLowerCase().includes(query.toLowerCase())
        )
      : index.slice(1, 4); // Just get recent ones if no query
    
    // Add relevant context up to token limit
    for (const sessionMeta of relevantSessions) {
      const summary = sessionMeta.summary || 
        `${sessionMeta.platform} session: ${sessionMeta.interactionCount} interactions`;
      const tokens = Math.ceil(summary.length / 4);
      
      if (context.totalTokens + tokens <= maxTokens) {
        context.relevantContext.push(summary);
        context.totalTokens += tokens;
        context.sessionCount++;
      } else {
        break;
      }
    }
    
    return NextResponse.json(context);
  } catch (error) {
    console.error('Error getting context:', error);
    return NextResponse.json(
      { error: 'Failed to get context' },
      { status: 500 }
    );
  }
}