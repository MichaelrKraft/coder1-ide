import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { withGeneralMiddleware } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Get project root directory
const getProjectRoot = () => {
    return process.cwd();
};

// Allowed file paths for security (prevent reading sensitive files)
const ALLOWED_PATHS = [
    'coder1-ide-next',
    'CANONICAL',
    'src', 
    'components',
    'lib',
    'pages',
    'public',
    'app',
    'services',
    'utils',
    'types',
    'hooks',
    'stores',
    '.claude-parallel-dev' // Allow Claude parallel development directory
];

// Blocked sensitive files
const BLOCKED_FILES = [
    '.env',
    '.env.local',
    '.env.production', 
    '.env.development',
    'package-lock.json',
    'yarn.lock',
    '.git',
    'node_modules',
    '.ssh',
    'id_rsa',
    'id_dsa',
    'config',
    'credentials'
];

async function fileReadHandler({ req }: { req: NextRequest }): Promise<NextResponse> {
    const request = req;
    try {
        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get('path');
        
        if (!filePath) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'File path is required'
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
        
        // Check for blocked files
        const fileName = path.basename(filePath);
        const relativePath = path.relative(projectRoot, fullPath);
        
        if (BLOCKED_FILES.some(blocked => fileName.includes(blocked) || relativePath.includes(blocked))) {
            // logger?.error(`❌ Access to sensitive file blocked: ${filePath}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: File access restricted'
                },
                { status: 403 }
            );
        }
        
        // Check if path starts with allowed directories or is a safe root file
        const pathParts = relativePath.split(path.sep);
        const topLevel = pathParts[0];
        
        // Allow certain safe root-level files
        const ALLOWED_ROOT_FILES = ['README.md', 'package.json', 'tsconfig.json', 'LICENSE', '.gitignore'];
        const isRootFile = pathParts.length === 1;
        const isSafeRootFile = isRootFile && ALLOWED_ROOT_FILES.includes(fileName);
        
        if (topLevel && !ALLOWED_PATHS.includes(topLevel) && !isSafeRootFile) {
            // logger?.error(`❌ Access to unauthorized directory: ${topLevel}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Directory access restricted'
                },
                { status: 403 }
            );
        }
        
        // Check if file exists
        try {
            await fs.access(fullPath);
        } catch (error) {
            // logger?.error(`File not found: ${fullPath} (requested path: ${filePath})`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'File not found'
                },
                { status: 404 }
            );
        }
        
        const content = await fs.readFile(fullPath, 'utf8');
        
        return NextResponse.json({
            success: true,
            content,
            path: filePath,
            server: 'unified-server'
        });
        
    } catch (error) {
        // logger?.error('❌ [Unified] File read error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to read file'
            },
            { status: 500 }
        );
    }
}

// Export with general middleware (rate limiting, validation, logging, but NO auth required)
export const GET = withGeneralMiddleware(fileReadHandler);