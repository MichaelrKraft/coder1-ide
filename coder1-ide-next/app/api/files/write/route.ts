import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireUser } from '@/lib/auth/request-auth';

const ALLOWED_ROOT = process.env.PROJECT_ROOT || process.cwd();

export async function POST(request: NextRequest) {
  try {
    // SECURITY: this route writes to the server filesystem — require a verified user.
    const auth = requireUser(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { filePath, content } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: 'filePath and content are required' },
        { status: 400 }
      );
    }

    // Prevent directory traversal
    // SECURITY (H4): require a separator after the root so a sibling dir cannot
    // pass a bare prefix check.
    const root = path.resolve(ALLOWED_ROOT);
    const resolved = path.resolve(root, filePath);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      return NextResponse.json(
        { error: 'Path outside project directory' },
        { status: 403 }
      );
    }

    // Only allow writing to existing files
    try {
      await fs.access(resolved);
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    await fs.writeFile(resolved, content, 'utf-8');
    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    console.error('[API/files/write] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
