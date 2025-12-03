import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const WORK_TREE_BASE = '/tmp/coder1-explorations';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.ts': 'application/typescript; charset=utf-8',
  '.tsx': 'application/typescript; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; strategyId: string; path?: string[] } }
) {
  try {
    const { sessionId, strategyId, path: pathSegments } = params;
    
    const sessionDir = path.join(WORK_TREE_BASE, sessionId);
    try {
      await fs.access(sessionDir);
    } catch {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const strategyDir = path.join(sessionDir, strategyId);
    try {
      await fs.access(strategyDir);
    } catch {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    const relativePath = pathSegments?.join('/') || 'index.html';
    const fullPath = path.join(strategyDir, relativePath);
    
    const normalizedFull = path.normalize(fullPath);
    const normalizedStrategy = path.normalize(strategyDir);
    if (!normalizedFull.startsWith(normalizedStrategy)) {
      return NextResponse.json(
        { error: 'Access denied - path traversal detected' },
        { status: 403 }
      );
    }

    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json(
        { error: `File not found: ${relativePath}` },
        { status: 404 }
      );
    }

    const content = await fs.readFile(fullPath);
    const mimeType = getMimeType(fullPath);
    const isText = mimeType.includes('text') || mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('typescript');

    return new NextResponse(isText ? content.toString('utf-8') : content, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Exploration-Session': sessionId,
        'X-Exploration-Strategy': strategyId,
      },
    });

  } catch (error) {
    console.error('[Preview API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to serve file',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
