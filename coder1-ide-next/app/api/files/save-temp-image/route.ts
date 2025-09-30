import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { base64, mimeType, path: filePath } = await request.json();

    if (!base64 || !mimeType || !filePath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure the path is in /tmp directory for security
    if (!filePath.startsWith('/tmp/')) {
      return NextResponse.json(
        { error: 'Images can only be saved to /tmp directory' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');

    // Write the file
    await writeFile(filePath, buffer);

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