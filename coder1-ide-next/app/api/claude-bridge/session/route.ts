/**
 * Claude Session Bridge API
 * Handles Claude CLI session integration for bridged files
 */

import { NextRequest, NextResponse } from 'next/server';
import { claudeSessionBridge } from '@/services/claude-session-bridge';
import { multimodalProcessor } from '@/services/beta/multimodal-processor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files: File[] = [];
    const sessionId = formData.get('sessionId') as string || 'default';
    const userPrompt = formData.get('userPrompt') as string || '';
    const autoInject = formData.get('autoInject') !== 'false'; // Default true
    const preferredFormat = formData.get('preferredFormat') as 'paths' | 'command' | 'both' || 'both';
    
    // Extract files from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided for session bridge' },
        { status: 400 }
      );
    }

    // Process files to extract content for better bridging
    console.log(`🌉 Processing ${files.length} files for Claude session bridge...`);
    const processedContent = await multimodalProcessor.processFiles(files);

    // Prepare files with content for bridging
    const filesWithContent = files.map(file => {
      let content = '';
      
      // Find processed content
      const processedFile = processedContent.files?.find(f => f.name === file.name);
      const processedPdf = processedContent.pdfs?.find(p => p.name === file.name);
      
      if (processedFile) {
        content = processedFile.content;
      } else if (processedPdf) {
        content = processedPdf.content;
      }

      return {
        file,
        content,
        metadata: {
          sessionId,
          processedAt: new Date().toISOString(),
          hasContent: content.length > 0
        }
      };
    });

    // Bridge files to Claude session
    const bridgeResult = await claudeSessionBridge.bridgeToSession(filesWithContent, {
      autoInject,
      generateSummary: true,
      preferredFormat
    });

    if (!bridgeResult.success) {
      return NextResponse.json({
        error: bridgeResult.error || 'Failed to bridge files to session',
        details: bridgeResult.message
      }, { status: 500 });
    }

    // Generate enhanced Claude command with user prompt
    const enhancedCommand = claudeSessionBridge.createClaudeCommandWithContext(
      bridgeResult.filePaths?.map(path => path) || [],
      userPrompt || 'Analyze these files',
      true // Include file contents in context
    );

    return NextResponse.json({
      success: true,
      message: bridgeResult.message,
      sessionBridge: {
        sessionId,
        filesCount: files.length,
        bridgedPaths: bridgeResult.filePaths,
        claudeCommand: bridgeResult.claudeCommand,
        enhancedCommand,
        injectionText: bridgeResult.injectionText,
        summary: bridgeResult.summary
      },
      processedContent: {
        text: processedContent.text,
        stats: {
          images: processedContent.images?.length || 0,
          pdfs: processedContent.pdfs?.length || 0,
          textFiles: processedContent.files?.length || 0,
          totalContent: (processedContent.files?.reduce((sum, f) => sum + f.content.length, 0) || 0) +
                       (processedContent.pdfs?.reduce((sum, p) => sum + p.content.length, 0) || 0)
        }
      },
      terminalDisplay: claudeSessionBridge.getTerminalFileDisplay(
        bridgeResult.filePaths?.map(path => path) || []
      ),
      bridgeStats: claudeSessionBridge.getSessionStats()
    });

  } catch (error: any) {
    console.error('Claude session bridge API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to bridge files to Claude session',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action'); // 'stats' | 'display' | 'command'

    const stats = claudeSessionBridge.getSessionStats();

    if (action === 'stats') {
      return NextResponse.json({
        stats,
        bridgeActive: stats.sessionActive
      });
    }

    if (action === 'command' || action === 'display') {
      // For now, return stats - in a full implementation, we'd track active file IDs
      return NextResponse.json({
        message: 'Session bridge ready',
        stats,
        note: 'Use POST endpoint to bridge files and get commands'
      });
    }

    return NextResponse.json({
      sessionBridge: {
        ready: true,
        stats
      }
    });

  } catch (error: any) {
    console.error('Claude session bridge GET error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get session bridge status',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}