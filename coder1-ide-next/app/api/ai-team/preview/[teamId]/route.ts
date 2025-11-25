import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

async function buildFileTree(dirPath: string, relativePath: string = ''): Promise<FileNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const entryRelativePath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, entryRelativePath);
      nodes.push({
        name: entry.name,
        path: entryRelativePath,
        type: 'directory',
        children
      });
    } else if (entry.isFile()) {
      const stats = await fs.stat(fullPath);
      nodes.push({
        name: entry.name,
        path: entryRelativePath,
        type: 'file',
        size: stats.size
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'directory' ? -1 : 1;
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;

    if (!teamId || typeof teamId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid team ID' },
        { status: 400 }
      );
    }

    if (teamId.includes('..') || teamId.includes('/') || teamId.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid team ID format (directory traversal attempt)' },
        { status: 400 }
      );
    }

    const worktreePath = path.join(process.cwd(), '.claude-parallel-dev', teamId);

    try {
      await fs.access(worktreePath);
    } catch {
      return NextResponse.json(
        { error: 'Team worktree not found', teamId },
        { status: 404 }
      );
    }

    const fileTree = await buildFileTree(worktreePath);

    if (fileTree.length === 0) {
      return NextResponse.json(
        { error: 'No files found in team worktree', teamId },
        { status: 404 }
      );
    }

    const totalFiles = fileTree.reduce((count, node) => {
      if (node.type === 'file') return count + 1;
      if (node.type === 'directory' && node.children) {
        return count + node.children.filter(n => n.type === 'file').length;
      }
      return count;
    }, 0);

    return NextResponse.json({
      teamId,
      worktreePath,
      fileTree,
      totalFiles,
      totalDirectories: fileTree.filter(n => n.type === 'directory').length
    });

  } catch (error) {
    console.error('Preview API error:', error);
    return NextResponse.json(
      { error: 'Failed to read team worktree', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
