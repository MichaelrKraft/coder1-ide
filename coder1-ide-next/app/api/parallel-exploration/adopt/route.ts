import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const WORK_TREE_BASE = '/tmp/coder1-explorations';

async function copyDirectory(src: string, dest: string, createdFiles: string[]): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, createdFiles);
    } else {
      await fs.copyFile(srcPath, destPath);
      createdFiles.push(destPath);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, strategyId, targetPath } = body;

    if (!sessionId || !strategyId) {
      return NextResponse.json(
        { error: 'sessionId and strategyId are required' },
        { status: 400 }
      );
    }

    const sessionDir = path.join(WORK_TREE_BASE, sessionId);
    try {
      await fs.access(sessionDir);
    } catch {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const strategyDir = path.join(sessionDir, strategyId);
    try {
      await fs.access(strategyDir);
    } catch {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    const projectRoot = process.cwd();
    const destination = targetPath 
      ? path.resolve(projectRoot, targetPath)
      : path.join(projectRoot, 'adopted-exploration');

    if (!destination.startsWith(projectRoot)) {
      return NextResponse.json(
        { error: 'Access denied - target path outside project' },
        { status: 403 }
      );
    }

    const createdFiles: string[] = [];
    await copyDirectory(strategyDir, destination, createdFiles);

    const relativeFiles = createdFiles.map(f => path.relative(projectRoot, f));
    const relativeDest = path.relative(projectRoot, destination);
    
    // Check if index.html exists for preview URL
    const hasIndexHtml = relativeFiles.some(f => f.endsWith('index.html'));
    const previewUrl = hasIndexHtml 
      ? `/api/preview?file=${encodeURIComponent(relativeDest + '/index.html')}`
      : null;

    console.log(`[Adopt API] ✅ Adopted strategy ${strategyId} from session ${sessionId}`);
    console.log(`[Adopt API] 📁 Created ${relativeFiles.length} files in ${relativeDest}`);
    if (previewUrl) {
      console.log(`[Adopt API] 👁️ Preview available at: ${previewUrl}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully adopted ${relativeFiles.length} files`,
      destination: relativeDest,
      files: relativeFiles,
      previewUrl,
      sessionId,
      strategyId
    });

  } catch (error) {
    console.error('[Adopt API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to adopt strategy',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
