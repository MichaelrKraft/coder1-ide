import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { withGeneralMiddleware } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import { bridgeManager } from '@/services/bridge-manager';

export const dynamic = 'force-dynamic';

// Get project root directory - SECURITY: Restricts to user workspace only
const getProjectRoot = () => {
    // SECURITY FIX: Allow navigation within user-workspaces/
    // This lets users browse their projects while protecting source code
    const workspacePath = process.env.USER_WORKSPACE_PATH || 'user-workspaces';
    return path.join(process.cwd(), workspacePath);
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

async function fileReadHandler({ req, user }: { req: NextRequest; user?: any }): Promise<NextResponse> {
    const request = req;
    try {
        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get('path');
        const useBridge = searchParams.get('useBridge') !== 'false'; // Default to true
        const queryUserId = searchParams.get('userId');

        if (!filePath) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'File path is required'
                },
                { status: 400 }
            );
        }

        // Check if bridge is connected and should be used
        // Use userId from: auth context > query param > fallback for backwards compatibility
        const userId = user?.id || queryUserId || 'default-user';

        if (useBridge && bridgeManager.hasBridgeForUser(userId)) {
            // Route through bridge to user's local machine
            try {
                console.log(`🌉 [Bridge] Routing file read request through bridge: ${filePath}`);

                const result = await bridgeManager.requestFileOperation(
                    userId,
                    'read',
                    filePath,
                    {}
                );

                // FileHandler returns { path, content, size, encoding }
                // Extract just the content string for the response
                const content = typeof result === 'object' && result.content !== undefined
                    ? result.content
                    : result;

                return NextResponse.json({
                    success: true,
                    content,
                    path: filePath,
                    server: 'bridge',
                    source: 'local-machine'
                });
            } catch (bridgeError) {
                console.error('🌉 [Bridge] File read error:', bridgeError);

                const errorMsg = bridgeError instanceof Error ? bridgeError.message : 'Bridge error';
                if (errorMsg.includes('No bridge connected') || errorMsg.includes('disconnected')) {
                    return NextResponse.json({
                        success: false,
                        error: 'Bridge connection lost',
                        message: 'Your local machine is no longer connected. Please reconnect the bridge CLI.',
                        reconnectUrl: '/bridge-setup'
                    }, { status: 503 });
                }

                // For other bridge errors (like file not found), pass through the error
                return NextResponse.json({
                    success: false,
                    error: errorMsg
                }, { status: 404 });
            }
        }

        // Fallback: Use server filesystem
        const projectRoot = getProjectRoot();
        const fullPath = path.resolve(projectRoot, filePath);

        // Enhanced security checks
        if (!fullPath.startsWith(projectRoot)) {
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
            if (pattern.endsWith('/')) {
                return normalizedPath.startsWith(pattern) || normalizedPath.includes('/' + pattern);
            }
            return normalizedPath.includes(pattern) || normalizedPath.endsWith(pattern);
        });

        if (isBlocked) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: This file type is restricted for security reasons'
                },
                { status: 403 }
            );
        }

        // Check if file exists
        try {
            await fs.access(fullPath);
        } catch (error) {
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
            server: 'unified-server',
            source: 'server-sandbox'
        });

    } catch (error) {
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