import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const BINARY_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.mp4', '.webm', '.mp3', '.wav', '.ogg',
  '.pdf', '.zip', '.tar', '.gz', '.rar',
  '.woff', '.woff2', '.ttf', '.eot',
  '.exe', '.dll', '.so', '.dylib'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit for preview

function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.includes(ext);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path');

    if (!teamId || typeof teamId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid team ID' },
        { status: 400 }
      );
    }

    if (!relativePath || typeof relativePath !== 'string') {
      return NextResponse.json(
        { error: 'File path parameter required' },
        { status: 400 }
      );
    }

    if (
      teamId.includes('..') || teamId.includes('/') || teamId.includes('\\') ||
      relativePath.includes('..') || path.isAbsolute(relativePath)
    ) {
      return NextResponse.json(
        { error: 'Invalid path format (directory traversal attempt)' },
        { status: 400 }
      );
    }

    const worktreePath = path.join(process.cwd(), '.claude-parallel-dev', teamId);
    const filePath = path.join(worktreePath, relativePath);

    const normalizedFilePath = path.normalize(filePath);
    const normalizedWorktreePath = path.normalize(worktreePath);
    
    if (!normalizedFilePath.startsWith(normalizedWorktreePath)) {
      return NextResponse.json(
        { error: 'Access denied: path outside worktree' },
        { status: 403 }
      );
    }

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: 'File not found', path: relativePath },
        { status: 404 }
      );
    }

    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      return NextResponse.json(
        { error: 'Path is not a file', path: relativePath },
        { status: 400 }
      );
    }

    if (stats.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: 'File too large for preview', 
          path: relativePath,
          size: stats.size,
          maxSize: MAX_FILE_SIZE,
          message: `File is ${(stats.size / 1024 / 1024).toFixed(2)}MB. Maximum preview size is 5MB.`
        },
        { status: 413 }
      );
    }

    if (isBinaryFile(filePath)) {
      return NextResponse.json(
        {
          error: 'Binary file cannot be previewed',
          path: relativePath,
          size: stats.size,
          extension: path.extname(filePath),
          message: 'This file type cannot be displayed in the preview.'
        },
        { status: 415 }
      );
    }

    const content = await fs.readFile(filePath, 'utf-8');

    return NextResponse.json({
      teamId,
      path: relativePath,
      content,
      size: stats.size,
      extension: path.extname(filePath),
      modified: stats.mtime.toISOString()
    });

  } catch (error) {
    console.error('Preview file API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to read file', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
