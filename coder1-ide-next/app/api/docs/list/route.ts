import { NextRequest, NextResponse } from 'next/server';
import { getDocumentationIntelligence } from '@/lib/documentation-intelligence';

export async function GET(request: NextRequest) {
  try {
    const docIntelligence = getDocumentationIntelligence();
    const docs = await docIntelligence.listAll();
    
    return NextResponse.json({
      success: true,
      docs,
      count: docs.length
    });
  } catch (error: any) {
    // logger?.error('❌ [DOC-API] List documentation failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list documentation',
        message: error.message 
      },
      { status: 500 }
    );
  }
}