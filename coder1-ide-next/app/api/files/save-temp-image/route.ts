import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { requireUser } from '@/lib/auth/request-auth';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: this route writes to the server filesystem — require a verified user.
    const auth = requireUser(request);
    if (auth.response) return auth.response;

    const { base64, mimeType, path: filePath } = await request.json();

    if (!base64 || !mimeType || !filePath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure the path is in /tmp directory for security.
    // SECURITY: canonicalize first — a raw startsWith('/tmp/') check lets
    // `/tmp/../etc/passwd` slip through and resolve outside /tmp on write.
    const resolvedPath = path.resolve(filePath);
    const tmpRoot = path.resolve('/tmp');
    if (resolvedPath !== tmpRoot && !resolvedPath.startsWith(tmpRoot + path.sep)) {
      return NextResponse.json(
        { error: 'Images can only be saved to /tmp directory' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');

    // Write the file
    await writeFile(resolvedPath, buffer);

    console.log(`✅ Saved temp image to: ${filePath}`);

    return NextResponse.json({
      success: true,
      path: filePath
    });

  } catch (error) {
    console.error('Error saving temp image:', error);
    return NextResponse.json(
      { error: 'Failed to save image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}