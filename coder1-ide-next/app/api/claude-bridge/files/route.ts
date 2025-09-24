/**
 * Claude File Bridge API
 * Handles file bridging for Claude CLI integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { claudeFileBridge } from '@/services/claude-file-bridge';
import { multimodalProcessor } from '@/services/beta/multimodal-processor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files: File[] = [];
    const sessionId = formData.get('sessionId') as string || 'default';
    const bridgeMode = formData.get('bridgeMode') as string || 'full'; // 'full' | 'filesystem-only'
    
    // Extract files from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Process files with multimodal processor if in full mode
    let processedContent: any = null;
    if (bridgeMode === 'full') {
      processedContent = await multimodalProcessor.processFiles(files);
    }

    // Bridge files to filesystem
    const bridgePromises = files.map(async (file) => {
      // Get content for text files and PDFs
      let content = '';
      
      if (bridgeMode === 'full' && processedContent) {
        // Try to find content in processed results
        const processedFile = processedContent.files?.find((f: any) => f.name === file.name);
        const processedPdf = processedContent.pdfs?.find((p: any) => p.name === file.name);
        
        if (processedFile) {
          content = processedFile.content;
        } else if (processedPdf) {
          content = processedPdf.content;
        }
      }

      return claudeFileBridge.bridgeFile(file, content, {
        sessionId,
        bridgeMode,
        timestamp: new Date().toISOString()
      });
    });

    const bridgedFiles = await Promise.all(bridgePromises);
    const fileIds = bridgedFiles.map(f => f.id);

    // Generate Claude CLI command
    const claudeCommand = claudeFileBridge.generateClaudeCommand(
      fileIds,
      `Analyze these ${files.length} file(s)`
    );

    // Generate summary for terminal
    const filesSummary = claudeFileBridge.generateFilesSummary(fileIds);

    return NextResponse.json({
      success: true,
      bridgedFiles: bridgedFiles.map(f => ({
        id: f.id,
        originalName: f.originalName,
        tempPath: f.tempPath,
        type: f.type,
        size: f.size,
        created: f.created,
      })),
      claudeCommand,
      filesSummary,
      processedContent: bridgeMode === 'full' ? {
        text: processedContent?.text,
        fileCount: {
          images: processedContent?.images?.length || 0,
          pdfs: processedContent?.pdfs?.length || 0,
          files: processedContent?.files?.length || 0,
        }
      } : undefined,
      stats: claudeFileBridge.getStats()
    });

  } catch (error: any) {
    console.error('File bridge API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to bridge files',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (fileId) {
      // Get specific bridged file
      const file = claudeFileBridge.getBridgedFile(fileId);
      if (!file) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        file: {
          id: file.id,
          originalName: file.originalName,
          tempPath: file.tempPath,
          type: file.type,
          size: file.size,
          created: file.created,
          accessed: file.accessed,
          metadata: file.metadata
        }
      });
    } else {
      // Get all bridged files
      const allFiles = claudeFileBridge.getAllBridgedFiles();
      
      return NextResponse.json({
        files: allFiles.map(f => ({
          id: f.id,
          originalName: f.originalName,
          tempPath: f.tempPath,
          type: f.type,
          size: f.size,
          created: f.created,
          accessed: f.accessed,
          metadata: f.metadata
        })),
        stats: claudeFileBridge.getStats()
      });
    }

  } catch (error: any) {
    console.error('File bridge GET error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve bridged files',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID required' },
        { status: 400 }
      );
    }

    const success = await claudeFileBridge.removeBridgedFile(fileId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'File not found or could not be removed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File removed successfully'
    });

  } catch (error: any) {
    console.error('File bridge DELETE error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to remove bridged file',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}