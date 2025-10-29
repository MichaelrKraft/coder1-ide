import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { withFileMiddleware } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

// Get project root directory - SECURITY: Restricts to user workspace only
const getProjectRoot = () => {
    // SECURITY FIX: Allow navigation within user-workspaces/
    // This lets users work on their projects while protecting source code
    const workspacePath = process.env.USER_WORKSPACE_PATH || 'user-workspaces';
    return path.join(process.cwd(), workspacePath);
};

// No longer need ALLOWED_PATHS - everything within workspace is allowed
// (keeping for backwards compatibility but not enforced)

// Blocked sensitive files and paths
const BLOCKED_FILES = [
    '.env',
    '.env.local',
    '.env.production', 
    '.env.development',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    '.git',
    'node_modules',
    '.ssh',
    'id_rsa',
    'id_dsa',
    'config',
    'credentials',
    'server.js',
    'app.js'
];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function fileWriteHandler({ req }: { req: NextRequest }): Promise<NextResponse> {
    const request = req;
    try {
        const body = await request.json();
        const { path: filePath, content } = body;
        
        if (!filePath || content === undefined) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'File path and content are required'
                },
                { status: 400 }
            );
        }
        
        const projectRoot = getProjectRoot();
        const fullPath = path.resolve(projectRoot, filePath);
        
        // Enhanced security checks
        if (!fullPath.startsWith(projectRoot)) {
            // logger?.error(`❌ Path traversal attempt: ${filePath}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Path traversal detected'
                },
                { status: 403 }
            );
        }
        
        // Check file size
        if (content && Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE) {
            // logger?.error(`❌ File too large: ${filePath} (${Buffer.byteLength(content, 'utf8')} bytes)`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'File too large: Maximum size is 5MB'
                },
                { status: 413 }
            );
        }
        
        // Check for blocked files
        const fileName = path.basename(filePath);
        const relativePath = path.relative(projectRoot, fullPath);
        
        if (BLOCKED_FILES.some(blocked => fileName.includes(blocked) || relativePath.includes(blocked))) {
            // logger?.error(`❌ Write to sensitive file blocked: ${filePath}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: File write restricted'
                },
                { status: 403 }
            );
        }
        
        // SECURITY: Workspace restriction - no need to check allowed paths
        // since getProjectRoot() already restricts to workspace directory
        // All files within workspace are allowed for writing
        
        // Ensure directory exists
        const dirPath = path.dirname(fullPath);
        await fs.mkdir(dirPath, { recursive: true });
        
        await fs.writeFile(fullPath, content, 'utf8');
        
        // logger?.info(`📝 [Unified] File written: ${filePath} (${Buffer.byteLength(content, 'utf8')} bytes)`);
        
        // Track file operation in project tracker
        try {
            const { projectTracker } = await import('@/services/project-tracker');
            await projectTracker.trackFileOperation(fullPath, 'write');
        } catch (err) {
            // Project tracker not available
        }
        
        return NextResponse.json({
            success: true,
            message: 'File saved successfully',
            path: filePath,
            server: 'unified-server'
        });
        
    } catch (error) {
        // logger?.error('❌ [Unified] File write error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to write file'
            },
            { status: 500 }
        );
    }
}

// Export with enhanced file middleware (rate limiting, validation, logging, auth)
export const POST = withFileMiddleware(fileWriteHandler);