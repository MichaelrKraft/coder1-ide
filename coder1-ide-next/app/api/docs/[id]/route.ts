import { NextRequest, NextResponse } from 'next/server';
import { getDocumentationIntelligence } from '@/lib/documentation-intelligence';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Documentation ID is required' },
        { status: 400 }
      );
    }

    const docIntelligence = getDocumentationIntelligence();
    const success = await docIntelligence.remove(id);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Documentation removed successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to remove documentation' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // // logger?.error('❌ [DOC-API] Remove documentation failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to remove documentation',
        message: error.message 
      },
      { status: 500 }
    );
  }
}