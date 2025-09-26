import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { withGeneralMiddleware } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Get project root directory
const getProjectRoot = (customPath?: string) => {
    if (customPath) {
        // Validate and resolve the custom path
        const resolvedPath = path.resolve(customPath);
        
        // Security check - prevent access to system directories
        const systemPaths = ['/etc', '/usr', '/var', '/bin', '/sbin', '/sys', '/proc', '/dev'];
        const homeDir = require('os').homedir();
        
        // Only allow paths within user's home directory or current project
        if (!resolvedPath.startsWith(homeDir) && !resolvedPath.startsWith(process.cwd())) {
            throw new Error('Access denied: Path must be within user directory or project');
        }
        
        // Check if path exists and is accessible
        try {
            require('fs').accessSync(resolvedPath, require('fs').constants.R_OK);
            return resolvedPath;
        } catch (error) {
            throw new Error('Path is not accessible or does not exist');
        }
    }
    
    return process.cwd();
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
 */
async function buildFileTree(dirPath: string, relativePath: string = '', depth: number = 0): Promise<any[]> {
    const children = [];
    const MAX_DEPTH = 2; // Limit scanning to 2 levels deep to prevent file handle exhaustion
  
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativeFilePath = path.join(relativePath, entry.name);
      
            if (entry.isDirectory()) {
                // Skip excluded directories  
                if (EXCLUDED_DIRS.includes(entry.name)) {
                    continue;
                }
        
                // Only recurse if we haven't hit max depth
                const subTree = depth < MAX_DEPTH ? await buildFileTree(fullPath, relativeFilePath, depth + 1) : [];
                children.push({
                    name: entry.name,
                    path: relativeFilePath,
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
                        path: relativeFilePath,
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

async function fileTreeHandler({ req }: { req: NextRequest }): Promise<NextResponse> {
    const request = req;
    try {
        // Get rootPath from query parameters
        const url = new URL(request.url);
        const rootPath = url.searchParams.get('rootPath');
        
        const projectRoot = getProjectRoot(rootPath || undefined);
        const tree = await buildFileTree(projectRoot);
        
        // REMOVED: // REMOVED: console.log(`📂 [Unified] File tree requested for: ${projectRoot}`);
        
        return NextResponse.json({
            success: true,
            tree: {
                name: path.basename(projectRoot),
                path: '/',
                type: 'directory',
                children: tree
            },
            currentRoot: projectRoot,
            server: 'unified-server'
        });
        
    } catch (error) {
        // logger?.error('❌ [Unified] File tree error:', error);
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

// Export with general middleware (rate limiting, validation, logging, but NO auth required)
export const GET = withGeneralMiddleware(fileTreeHandler);