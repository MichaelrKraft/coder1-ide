import { NextRequest, NextResponse } from 'next/server';
import { getDocumentationIntelligence } from '@/lib/documentation-intelligence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, category, title, content } = body;

    const docIntelligence = getDocumentationIntelligence();
    let result;

    // Handle direct content upload
    if (content && title) {
      result = await docIntelligence.addFromContent(title, content, category);
    }
    // Handle URL-based upload
    else if (url) {
      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
      
      result = await docIntelligence.addFromUrl(url, category);
    }
    // Neither URL nor content provided
    else {
      return NextResponse.json(
        { error: 'Either URL or content with title is required' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Documentation added successfully',
      data: result
    });
  } catch (error: any) {
    console.error('❌ [DOC-API] Add documentation failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add documentation',
        message: error.message 
      },
      { status: 500 }
    );
  }
}