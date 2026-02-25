import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getDocumentationIntelligence } from '@/lib/documentation-intelligence';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const dataDir = path.join(process.cwd(), 'data', 'documentation');
    const docPath = path.join(dataDir, `${id}.json`);
    const raw = await fs.readFile(docPath, 'utf-8');
    const doc = JSON.parse(raw);
    return NextResponse.json({
      success: true,
      content: doc.content || '',
      title: doc.title
    });
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}

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