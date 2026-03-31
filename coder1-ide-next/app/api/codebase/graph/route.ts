import { NextResponse } from 'next/server';
import path from 'path';

const CodebaseWiki = require('@/services/codebase-wiki.js');

let codebaseWiki: any = null;

function getCodebaseWiki() {
  if (!codebaseWiki) {
    const projectRoot = path.join(process.cwd(), '..');
    codebaseWiki = new CodebaseWiki({ projectRoot, logger: console });
    codebaseWiki.indexCodebase().catch((err: any) => {
      console.error('Failed to index codebase:', err);
    });
  }
  return codebaseWiki;
}

const FILE_COLORS: Record<string, string> = {
  '.tsx': '#6366f1',
  '.ts': '#06b6d4',
  '.js': '#10b981',
  '.jsx': '#8b5cf6',
  '.css': '#f59e0b',
  '.json': '#6b7280',
  '.md': '#94a3b8',
};

function getFileColor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return FILE_COLORS[ext] ?? '#6b7280';
}

function resolveLocalImport(
  fromFile: string,
  importStr: string,
  allFiles: Set<string>
): string | null {
  if (!importStr.startsWith('.')) return null;
  const fromDir = path.dirname(fromFile);
  const base = path.normalize(path.join(fromDir, importStr));
  if (allFiles.has(base)) return base;
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    if (allFiles.has(base + ext)) return base + ext;
    const index = path.join(base, 'index' + ext);
    if (allFiles.has(index)) return index;
  }
  return null;
}

export async function GET() {
  try {
    const wiki = getCodebaseWiki();
    const filesMap: Map<string, any> = wiki.index.files;
    const depsMap: Map<string, any> = wiki.index.dependencies;
    const functionsMap: Map<string, any> = wiki.index.functions;
    const allFilePaths = new Set<string>(filesMap.keys());

    // Count functions per file
    const functionCount = new Map<string, number>();
    for (const [, func] of functionsMap) {
      functionCount.set(func.file, (functionCount.get(func.file) ?? 0) + 1);
    }

    // Resolve links and compute in-degree
    const inDegree = new Map<string, number>();
    const rawLinks: Array<{ source: string; target: string }> = [];
    for (const [, dep] of depsMap) {
      const { from, to } = dep;
      const resolvedTo = resolveLocalImport(from, to, allFilePaths);
      if (!resolvedTo || resolvedTo === from) continue;
      inDegree.set(resolvedTo, (inDegree.get(resolvedTo) ?? 0) + 1);
      rawLinks.push({ source: from, target: resolvedTo });
    }

    // Build nodes sorted by in-degree, capped at 500
    const allNodes = Array.from(filesMap.entries()).map(([filePath, fileInfo]) => ({
      id: filePath,
      name: path.basename(filePath),
      path: filePath,
      val: Math.max(1, (inDegree.get(filePath) ?? 0) + 1),
      color: getFileColor(filePath),
      functions: functionCount.get(filePath) ?? 0,
      lines: fileInfo.lines ?? 0,
      ext: path.extname(filePath).toLowerCase(),
    }));
    allNodes.sort((a, b) => b.val - a.val);
    const nodes = allNodes.slice(0, 500);
    const nodeIdSet = new Set(nodes.map((n) => n.id));

    // Filter and deduplicate links
    const seenLinks = new Set<string>();
    const links = rawLinks
      .filter((l) => nodeIdSet.has(l.source) && nodeIdSet.has(l.target))
      .filter((l) => {
        const key = `${l.source}|${l.target}`;
        if (seenLinks.has(key)) return false;
        seenLinks.add(key);
        return true;
      })
      .map((l) => ({ ...l, color: '#374151' }));

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error('Failed to build codebase graph:', error);
    return NextResponse.json(
      {
        error: 'Failed to build codebase graph',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
