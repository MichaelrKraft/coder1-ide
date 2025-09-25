import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { documentationProcessor } from '@/services/documentation-processor';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Process file using the documentation processor
    let document;
    try {
      document = await documentationProcessor.processFile(file);
    } catch (processingError: any) {
      return NextResponse.json(
        { error: processingError.message || 'Failed to process file' },
        { status: 400 }
      );
    }
    
    // Store document in data directory
    const dataDir = path.join(process.cwd(), 'data', 'documentation');
    await fs.mkdir(dataDir, { recursive: true });
    
    const docPath = path.join(dataDir, `${document.docId}.json`);
    await fs.writeFile(docPath, JSON.stringify(document, null, 2));
    
    // If companion service is available, forward to it
    try {
      const companionResponse = await fetch('http://localhost:57132/docs/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(document)
      });
      
      if (companionResponse.ok) {
        const companionData = await companionResponse.json();
        return NextResponse.json({
          success: true,
          docId: document.docId,
          message: 'File uploaded and processed successfully',
          companion: companionData,
          document: {
            id: document.docId,
            title: document.title,
            type: document.type,
            categories: document.categories,
            wordCount: document.metadata.wordCount
          }
        });
      }
    } catch (companionError) {
      console.log('Companion service not available, stored locally');
    }
    
    return NextResponse.json({
      success: true,
      docId: document.docId,
      message: 'File uploaded and processed successfully',
      document: {
        id: document.docId,
        title: document.title,
        type: document.type,
        categories: document.categories,
        wordCount: document.metadata.wordCount,
        fileName: document.metadata.fileName,
        fileType: document.metadata.fileType
      }
    });
    
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// GET endpoint to list uploaded documents
export async function GET(req: NextRequest) {
  try {
    const dataDir = path.join(process.cwd(), 'data', 'documentation');
    
    // Check if directory exists
    try {
      await fs.access(dataDir);
    } catch {
      return NextResponse.json({ documents: [] });
    }
    
    const files = await fs.readdir(dataDir);
    const documents = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dataDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const doc = JSON.parse(content);
        
        // Don't send full content in list
        documents.push({
          docId: doc.docId,
          title: doc.title,
          url: doc.url,
          categories: doc.categories,
          wordCount: doc.metadata?.wordCount || doc.wordCount,
          processedAt: doc.metadata?.processedAt || doc.processedAt,
          type: doc.type,
          fileType: doc.metadata?.fileType || doc.fileType,
          fileName: doc.metadata?.fileName || doc.fileName,
          fileSize: doc.metadata?.fileSize
        });
      }
    }
    
    // Sort by processedAt date (newest first)
    documents.sort((a, b) => {
      const dateA = new Date(a.processedAt).getTime();
      const dateB = new Date(b.processedAt).getTime();
      return dateB - dateA;
    });
    
    return NextResponse.json({
      documents,
      count: documents.length
    });
    
  } catch (error: any) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list documents' },
      { status: 500 }
    );
  }
}