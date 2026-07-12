import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { withFileMiddleware } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import { bridgeManager } from '@/services/bridge-manager';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Get project root directory - SECURITY: Restricts to user workspace only
const getProjectRoot = (customPath?: string) => {
    // SECURITY FIX: Allow navigation within user-workspaces/
    // This lets users browse their projects while protecting source code
    const workspacePath = process.env.USER_WORKSPACE_PATH || 'user-workspaces';
    const workspaceRoot = path.join(process.cwd(), workspacePath);
    
    if (customPath) {
        // Validate and resolve the custom path
        const resolvedPath = path.resolve(customPath);
        
        // CRITICAL SECURITY: Only allow paths within the user workspace
        // In development, allow any local path (bridge runs on user's own machine)
        const isDevelopment = process.env.NODE_ENV === 'development';
        // SECURITY (H4): require a separator after the root so a sibling dir like
        // `<workspaceRoot>-secrets` cannot pass a bare prefix check.
        const withinWorkspace =
            resolvedPath === workspaceRoot ||
            resolvedPath.startsWith(workspaceRoot + path.sep);
        if (!isDevelopment && !withinWorkspace) {
            throw new Error('Access denied: Path must be within user workspace');
        }
        
        // Check if path exists and is accessible
        try {
            require('fs').accessSync(resolvedPath, require('fs').constants.R_OK);
            return resolvedPath;
        } catch (error) {
            throw new Error('Path is not accessible or does not exist');
        }
    }
    
    // Return user workspace directory (NOT project source code)
    return workspaceRoot;
};

// File extensions to include in search
const SUPPORTED_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.css', '.scss', '.html',
    '.vue', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.php',
    '.rb', '.sh', '.yml', '.yaml', '.xml', '.sql', '.gitignore', '.dockerignore',
    '.eslintrc', '.prettierrc', '.babelrc'
];

// Directories to exclude from search
const EXCLUDED_DIRS = [
    'node_modules', '.git', '.next', 'build', 'dist', 'coverage', 
    '.nyc_output', 'logs', '.cache', '.tmp', '.temp', 'ARCHIVE',
    'backups', 'backup_*', 'db', 'summaries', 'exports'
];

// Sensitive files to never show (for security)
const BLOCKED_FILES = [
    '.env', '.env.local', '.env.production', '.env.development', '.env.test',
    'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519',
    '.pem', '.key', '.cert', 'credentials', 'secrets',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml' // Large files, not useful in editor
];

/**
 * Build hierarchical file tree
 * Returns ABSOLUTE paths to ensure bridge compatibility
 */
async function buildFileTree(dirPath: string, depth: number = 0): Promise<any[]> {
    const children = [];
    const MAX_DEPTH = 10; // Allow deep navigation for user projects (was 2, too restrictive)

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                // Skip excluded directories
                if (EXCLUDED_DIRS.includes(entry.name)) {
                    continue;
                }

                // Only recurse if we haven't hit max depth
                const subTree = depth < MAX_DEPTH ? await buildFileTree(fullPath, depth + 1) : [];
                children.push({
                    name: entry.name,
                    path: fullPath,  // ABSOLUTE path for bridge compatibility
                    type: 'directory',
                    children: subTree
                });

            } else if (entry.isFile()) {
                // Skip blocked/sensitive files
                if (BLOCKED_FILES.some(blocked => entry.name === blocked || entry.name.includes(blocked))) {
                    continue;
                }

                // Check if file extension is supported
                const ext = path.extname(entry.name).toLowerCase();
                if (SUPPORTED_EXTENSIONS.includes(ext) || entry.name.startsWith('.')) {
                    children.push({
                        name: entry.name,
                        path: fullPath,  // ABSOLUTE path for bridge compatibility
                        type: 'file'
                    });
                }
            }
        }
    } catch (error) {
        // logger?.error(`Error building file tree for ${dirPath}:`, error);
    }

    // Sort children: directories first, then files, alphabetically
    children.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    return children;
}

async function fileTreeHandler({ req, user }: { req: NextRequest; user?: any }): Promise<NextResponse> {
    const request = req;
    try {
        // Get rootPath from query parameters
        const url = new URL(request.url);
        const rootPath = url.searchParams.get('rootPath');
        const useBridge = url.searchParams.get('useBridge') !== 'false'; // Default to true

        // SECURITY (C2): userId comes ONLY from the verified auth context — never from a
        // client-supplied query param. withFileMiddleware enforces requireAuth.
        if (!user?.id) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }
        const userId = user.id;

        if (useBridge && bridgeManager.hasBridgeForUser(userId)) {
            // Route through bridge to user's local machine
            try {
                console.log(`🌉 [Bridge] Routing file tree request through bridge for path: ${rootPath || '~'}`);

                const actualRoot = rootPath || process.env.HOME || '~';
                const bridgeResult = await bridgeManager.requestFileOperation(
                    userId,
                    'list',
                    actualRoot,
                    { recursive: false } // Get immediate children only
                );

                // Transform bridge result (flat array) to match expected tree format
                // FileHandler.list() returns: [{ name, path, type, size, modified }, ...]
                // Expected format: { name, path, type, children: [...] }
                const transformToTree = (items: any[]): any[] => {
                    if (!Array.isArray(items)) return [];
                    return items.map(item => ({
                        name: item.name,
                        path: item.path,
                        type: item.type,
                        size: item.size,
                        modified: item.modified,
                        children: item.type === 'directory' ? [] : undefined
                    }));
                };

                const treeData = {
                    name: path.basename(actualRoot) || 'home',
                    path: actualRoot,
                    type: 'directory' as const,
                    children: transformToTree(bridgeResult)
                };

                return NextResponse.json({
                    success: true,
                    tree: treeData,
                    currentRoot: actualRoot,
                    server: 'bridge',
                    source: 'local-machine'
                });
            } catch (bridgeError) {
                console.error('🌉 [Bridge] File tree error:', bridgeError);

                // If bridge error mentions disconnection, return specific error
                const errorMsg = bridgeError instanceof Error ? bridgeError.message : 'Bridge error';
                if (errorMsg.includes('No bridge connected') || errorMsg.includes('disconnected')) {
                    return NextResponse.json({
                        success: false,
                        error: 'Bridge connection lost',
                        message: 'Your local machine is no longer connected. Please reconnect the bridge CLI.',
                        reconnectUrl: '/bridge-setup'
                    }, { status: 503 });
                }

                // For other bridge errors, fall back to server filesystem
                console.log('🌉 [Bridge] Falling back to server filesystem');
            }
        }

        // Fallback: Use server filesystem (for users without bridge or if bridge fails)
        const projectRoot = getProjectRoot(rootPath || undefined);
        const tree = await buildFileTree(projectRoot);

        return NextResponse.json({
            success: true,
            tree: {
                name: path.basename(projectRoot),
                path: projectRoot,  // ABSOLUTE path for bridge compatibility
                type: 'directory',
                children: tree
            },
            currentRoot: projectRoot,
            server: 'unified-server',
            source: 'server-sandbox'
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to build file tree';
        return NextResponse.json(
            {
                success: false,
                error: errorMessage
            },
            { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 500 }
        );
    }
}

// SECURITY FIX (Feb 23, 2026): Require authentication for file access
// Export with file middleware (rate limiting, validation, logging, AND auth required)
export const GET = withFileMiddleware(fileTreeHandler);