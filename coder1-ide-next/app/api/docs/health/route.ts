import { NextRequest, NextResponse } from 'next/server';
import { getDocumentationIntelligence } from '@/lib/documentation-intelligence';

export async function GET(request: NextRequest) {
  try {
    const docIntelligence = getDocumentationIntelligence();
    const health = await docIntelligence.getHealth();
    
    return NextResponse.json(health);
  } catch (error: any) {
    // // logger?.error('❌ [DOC-API] Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}