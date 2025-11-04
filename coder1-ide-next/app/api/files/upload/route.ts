import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Get user workspace directory
const getWorkspaceRoot = () => {
  const workspacePath = process.env.USER_WORKSPACE_PATH || 'user-workspaces';
  return path.join(process.cwd(), workspacePath, 'default'); // Default to 'default' user for now
};

// Blocked file extensions for security
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1', // Executables
  '.com', '.msi', '.app', '.deb', '.rpm', // Installers
  '.dll', '.so', '.dylib', // Libraries
  '.scr', '.pif', '.cpl', // System files
];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function fileUploadHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        },
        { status: 413 }
      );
    }

    // Validate file extension
    const fileExt = path.extname(file.name).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        {
          success: false,
          error: `File type not allowed: ${fileExt}. Executable files cannot be uploaded for security reasons.`
        },
        { status: 403 }
      );
    }

    // Get workspace directory
    const workspaceRoot = getWorkspaceRoot();

    // Ensure workspace directory exists
    await fs.mkdir(workspaceRoot, { recursive: true });

    // Sanitize filename (remove path traversal attempts)
    const sanitizedFileName = path.basename(file.name);

    // Create full file path
    const filePath = path.join(workspaceRoot, sanitizedFileName);

    // Check if file already exists
    let finalPath = filePath;
    let counter = 1;
    while (true) {
      try {
        await fs.access(finalPath);
        // File exists, add counter to filename
        const ext = path.extname(sanitizedFileName);
        const nameWithoutExt = path.basename(sanitizedFileName, ext);
        finalPath = path.join(workspaceRoot, `${nameWithoutExt} (${counter})${ext}`);
        counter++;
      } catch {
        // File doesn't exist, we can use this path
        break;
      }
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write file to workspace
    await fs.writeFile(finalPath, buffer);

    // Get relative path for file explorer
    const relativePath = path.basename(finalPath);

    // logger?.info(`✅ File uploaded: ${relativePath} (${file.size} bytes)`);

    return NextResponse.json({
      success: true,
      path: relativePath,
      name: path.basename(finalPath),
      size: file.size,
      message: 'File uploaded successfully'
    });
  } catch (error: any) {
    // logger?.error('❌ File upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload file',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export const POST = fileUploadHandler;
