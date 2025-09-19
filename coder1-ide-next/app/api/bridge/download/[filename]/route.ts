import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;
  
  // Validate filename to prevent directory traversal
  const validFiles = [
    'coder1-bridge-win.exe',
    'coder1-bridge-macos', 
    'coder1-bridge-linux'
  ];
  
  if (!validFiles.includes(filename)) {
    return NextResponse.json(
      { error: 'Invalid file requested' },
      { status: 400 }
    );
  }
  
  // Map to actual file paths in dist folder
  const fileMap: Record<string, string> = {
    'coder1-bridge-win.exe': 'coder1-bridge-win.exe',
    'coder1-bridge-macos': 'coder1-bridge-macos',
    'coder1-bridge-linux': 'coder1-bridge-linux'
  };
  
  const actualFilename = fileMap[filename];
  const filePath = path.join(process.cwd(), 'coder1-bridge', 'dist', actualFilename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    // For now, return a placeholder message since files aren't uploaded yet
    return NextResponse.json(
      { 
        error: 'Bridge executables not yet available',
        message: 'The Bridge executables are being prepared for release. Please check back soon!',
        filename: filename
      },
      { status: 404 }
    );
  }
  
  // Read file
  const fileBuffer = fs.readFileSync(filePath);
  
  // Set appropriate headers
  const headers = new Headers();
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  headers.set('Content-Length', fileBuffer.length.toString());
  
  return new NextResponse(fileBuffer, {
    status: 200,
    headers
  });
}