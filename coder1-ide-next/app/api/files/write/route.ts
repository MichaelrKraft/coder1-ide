import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { withFileMiddleware } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import { bridgeManager } from '@/services/bridge-manager';

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

async function fileWriteHandler({ req, user }: { req: NextRequest; user?: any }): Promise<NextResponse> {
    const request = req;
    try {
        const body = await request.json();
        const { path: filePath, content, useBridge: useBridgeParam, userId: bodyUserId } = body;
        const useBridge = useBridgeParam !== false; // Default to true

        if (!filePath || content === undefined) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'File path and content are required'
                },
                { status: 400 }
            );
        }

        // Check if bridge is connected and should be used
        // Use userId from: auth context > request body > fallback for backwards compatibility
        const userId = user?.id || bodyUserId || 'default-user';

        if (useBridge && bridgeManager.hasBridgeForUser(userId)) {
            // Route through bridge to user's local machine
            try {
                console.log(`🌉 [Bridge] Routing file write request through bridge: ${filePath}`);

                await bridgeManager.requestFileOperation(
                    userId,
                    'write',
                    filePath,
                    { content }
                );

                return NextResponse.json({
                    success: true,
                    message: 'File saved successfully',
                    path: filePath,
                    server: 'bridge',
                    source: 'local-machine'
                });
            } catch (bridgeError) {
                console.error('🌉 [Bridge] File write error:', bridgeError);

                const errorMsg = bridgeError instanceof Error ? bridgeError.message : 'Bridge error';
                if (errorMsg.includes('No bridge connected') || errorMsg.includes('disconnected')) {
                    return NextResponse.json({
                        success: false,
                        error: 'Bridge connection lost',
                        message: 'Your local machine is no longer connected. Please reconnect the bridge CLI.',
                        reconnectUrl: '/bridge-setup'
                    }, { status: 503 });
                }

                // For other bridge errors, return the error
                return NextResponse.json({
                    success: false,
                    error: errorMsg
                }, { status: 500 });
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

        // Check file size
        if (content && Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE) {
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
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: File write restricted'
                },
                { status: 403 }
            );
        }

        // Ensure directory exists
        const dirPath = path.dirname(fullPath);
        await fs.mkdir(dirPath, { recursive: true });

        await fs.writeFile(fullPath, content, 'utf8');

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
            server: 'unified-server',
            source: 'server-sandbox'
        });

    } catch (error) {
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