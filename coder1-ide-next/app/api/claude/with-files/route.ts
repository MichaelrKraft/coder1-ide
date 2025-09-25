/**
 * @deprecated This endpoint is no longer used.
 * Files are now processed directly through /api/claude/bridge-files
 * and made available to Claude Code through content extraction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { claudeCliService } from '@/services/claude-cli-service';
import claudeFileBridge from '@/services/claude-file-bridge';

// Mark as dynamic since this uses request data
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, fileIds, context } = await request.json();
    
    if (!fileIds || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'No file IDs provided' },
        { status: 400 }
      );
    }
    
    // Check if Claude CLI is available
    if (!claudeCliService.isClaudeAvailable()) {
      return NextResponse.json(
        { 
          error: 'Claude CLI not available', 
          details: 'Please install Claude Code CLI from https://claude.ai/code',
          command: claudeCliService.getClaudeCommand()
        },
        { status: 503 }
      );
    }
    
    // Get file paths from bridged files
    const filePaths: string[] = [];
    const fileNames: string[] = [];
    
    for (const fileId of fileIds) {
      const bridgedFile = claudeFileBridge.getBridgedFile(fileId);
      if (bridgedFile) {
        filePaths.push(bridgedFile.tempPath);
        fileNames.push(bridgedFile.originalName);
      } else {
        console.warn(`⚠️ File ID ${fileId} not found in bridge`);
      }
    }
    
    if (filePaths.length === 0) {
      return NextResponse.json(
        { error: 'No valid files found in bridge' },
        { status: 404 }
      );
    }
    
    console.log(`🎯 Sending ${filePaths.length} files to Claude CLI:`, fileNames);
    
    const session = sessionId || 'default';
    
    // Create session if needed
    if (!claudeCliService.getSession(session)) {
      claudeCliService.createSession(session);
    }
    
    // Send message with files to Claude CLI
    const { response, command } = await claudeCliService.sendMessageWithFiles(
      session,
      message || 'Please analyze these files',
      filePaths,
      context
    );
    
    console.log(`✅ Claude CLI processed files successfully`);
    
    return NextResponse.json({ 
      content: response,
      command: command,
      sessionId: session,
      files: fileNames
    });
    
  } catch (error) {
    console.error('Claude CLI with files error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}