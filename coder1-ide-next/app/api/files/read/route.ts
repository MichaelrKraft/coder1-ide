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

// Blocked sensitive files and patterns
// These files should never be accessible regardless of location
const BLOCKED_PATTERNS = [
    // Environment and config files
    '.env',
    '.env.local',
    '.env.production', 
    '.env.development',
    '.env.test',
    
    // Lock files (can be large and not useful to edit)
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    
    // Version control and sensitive directories
    '.git/',
    'node_modules/',
    '.ssh/',
    '.aws/',
    '.docker/',
    
    // SSH and credential files
    'id_rsa',
    'id_dsa',
    'id_ecdsa',
    'id_ed25519',
    '.pem',
    '.key',
    '.cert',
    'credentials',
    'secrets',
    
    // System files
    '.DS_Store',
    'Thumbs.db',
    '.vscode/settings.json', // May contain secrets
    
    // Build artifacts (usually large)
    '.next/',
    'dist/',
    'build/',
    'out/'
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
        
        // Check for blocked files and patterns
        const relativePath = path.relative(projectRoot, fullPath);
        const normalizedPath = relativePath.replace(/\\/g, '/'); // Normalize path separators
        
        // Check if the file path matches any blocked pattern
        const isBlocked = BLOCKED_PATTERNS.some(pattern => {
            // For directory patterns (ending with /), check if path starts with it
            if (pattern.endsWith('/')) {
                return normalizedPath.startsWith(pattern) || normalizedPath.includes('/' + pattern);
            }
            // For file patterns, check if path includes or ends with it
            return normalizedPath.includes(pattern) || normalizedPath.endsWith(pattern);
        });
        
        if (isBlocked) {
            // logger?.error(`❌ Access to sensitive file blocked: ${filePath}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: This file type is restricted for security reasons'
                },
                { status: 403 }
            );
        }
        
        // No directory restrictions - if it's not in the blocked list, it's allowed
        // This ensures any file shown in the explorer can be opened
        
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
        
        // Track file operation in project tracker
        try {
            const { projectTracker } = await import('@/services/project-tracker');
            await projectTracker.trackFileOperation(fullPath, 'read');
        } catch (err) {
            // Project tracker not available
        }
        
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