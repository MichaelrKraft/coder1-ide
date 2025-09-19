import { NextRequest, NextResponse } from 'next/server';
import { getDocumentationIntelligence } from '@/lib/documentation-intelligence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, maxTokens, category } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const docIntelligence = getDocumentationIntelligence();
    const results = await docIntelligence.search(query, {
      maxTokens: maxTokens || 2000,
      category
    });
    
    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length
    });
  } catch (error: any) {
    // logger?.error('❌ [DOC-API] Search failed:', error);
    return NextResponse.json(
      { 
        error: 'Search failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}