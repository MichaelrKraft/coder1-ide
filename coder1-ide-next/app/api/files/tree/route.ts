import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { withGeneralMiddleware } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

// Get project root directory
const getProjectRoot = () => {
    return process.cwd();
};

// File extensions to include in search
const SUPPORTED_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.css', '.scss', '.html',
    '.vue', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.php',
    '.rb', '.sh', '.yml', '.yaml', '.xml', '.sql', '.env', '.gitignore'
];

// Directories to exclude from search
const EXCLUDED_DIRS = [
    'node_modules', '.git', '.next', 'build', 'dist', 'coverage', 
    '.nyc_output', 'logs', '.cache', '.tmp', '.temp', 'ARCHIVE',
    'backups', 'backup_*', 'db', 'summaries', 'exports'
];

/**
 * Build hierarchical file tree
 */
async function buildFileTree(dirPath: string, relativePath: string = ''): Promise<any[]> {
    const children = [];
  
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
        
                // Recursively build tree for directories
                const subTree = await buildFileTree(fullPath, relativeFilePath);
                children.push({
                    name: entry.name,
                    path: relativeFilePath,
                    type: 'directory',
                    children: subTree
                });
        
            } else if (entry.isFile()) {
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
        const projectRoot = getProjectRoot();
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
            server: 'unified-server'
        });
        
    } catch (error) {
        // logger?.error('❌ [Unified] File tree error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to build file tree'
            },
            { status: 500 }
        );
    }
}

// Export with general middleware (rate limiting, validation, logging, but NO auth required)
export const GET = withGeneralMiddleware(fileTreeHandler);