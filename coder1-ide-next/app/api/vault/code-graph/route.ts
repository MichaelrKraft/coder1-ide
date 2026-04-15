import { NextRequest, NextResponse } from 'next/server';
import { assertLocalOnly } from '@/lib/vault-security';
import * as fs from 'fs';
import * as path from 'path';
import type { CodeGraphData, CodeGraphNode, CodeGraphLink } from '@/lib/vault-types';

// Directories to skip during file traversal
const SKIP_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', '.git', 'coverage',
  '.turbo', '.cache', 'out', '.vercel', '__pycache__',
]);

// File extensions to include
const INCLUDE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);

// Try extensions in order when resolving an import path
const RESOLVE_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

// In-memory cache: root path → { data, timestamp }
const cache = new Map<string, { data: CodeGraphData; timestamp: number }>();
const CACHE_TTL_MS = 30_000;

// Max files before truncating (keeps graph renderable)
const MAX_FILES = 800;

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

function collectFiles(dir: string, root: string, files: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // permission error — skip
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectFiles(fullPath, root, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (INCLUDE_EXTS.has(ext)) {
        files.push(fullPath);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// tsconfig path alias loading
// ---------------------------------------------------------------------------

function loadTsconfigAliases(root: string): Record<string, string> {
  const tsconfigPath = path.join(root, 'tsconfig.json');
  const aliases: Record<string, string> = {};

  try {
    const raw = fs.readFileSync(tsconfigPath, 'utf-8');
    // Strip JSON comments (tsconfig allows them)
    const stripped = raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const tsconfig = JSON.parse(stripped);
    const paths = tsconfig?.compilerOptions?.paths ?? {};
    const baseUrl = tsconfig?.compilerOptions?.baseUrl ?? '.';
    const absBase = path.resolve(root, baseUrl);

    for (const [alias, targets] of Object.entries(paths)) {
      if (!Array.isArray(targets) || targets.length === 0) continue;
      // alias like "@/*" → targets like ["./src/*"] or ["src/*"]
      const cleanAlias = alias.replace(/\/\*$/, '/');
      const target = (targets[0] as string).replace(/\/\*$/, '/');
      aliases[cleanAlias] = path.resolve(absBase, target);
    }

    // Common convention: "@/" → project root (Next.js default)
    if (!aliases['@/']) {
      aliases['@/'] = root;
    }
  } catch {
    // No tsconfig or parse error — fall back to "@/" → root
    aliases['@/'] = root;
  }

  return aliases;
}

// ---------------------------------------------------------------------------
// Import extraction (regex-based, handles static + dynamic)
// ---------------------------------------------------------------------------

const IMPORT_PATTERNS = [
  /from\s+['"]([^'"]+)['"]/g,                    // import ... from 'x'
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,         // import('x')
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,        // require('x')
  /export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g, // export * from 'x'
];

function extractImports(content: string): string[] {
  const imports: string[] = [];
  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0; // reset stateful regex
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      // Skip template literals or anything without a static string
      if (importPath && !importPath.includes('${')) {
        imports.push(importPath);
      }
    }
  }
  return imports;
}

// ---------------------------------------------------------------------------
// Import path resolution
// ---------------------------------------------------------------------------

function resolveImport(
  importPath: string,
  importerDir: string,
  aliases: Record<string, string>,
  fileSet: Set<string>
): string | null {
  let candidate: string;

  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    // Relative import
    candidate = path.resolve(importerDir, importPath);
  } else {
    // Check aliases
    let matched = false;
    for (const [prefix, target] of Object.entries(aliases)) {
      if (importPath.startsWith(prefix)) {
        candidate = path.join(target, importPath.slice(prefix.length));
        matched = true;
        break;
      }
    }
    if (!matched) return null; // external package
  }

  // Try exact path first, then with extensions, then /index.*
  const candidates = [
    candidate,
    ...RESOLVE_EXTS.map(ext => candidate + ext),
    ...RESOLVE_EXTS.map(ext => path.join(candidate, 'index' + ext)),
  ];

  for (const c of candidates) {
    if (fileSet.has(c)) return c;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Graph builder
// ---------------------------------------------------------------------------

function buildGraph(root: string): CodeGraphData {
  const allFiles: string[] = [];
  collectFiles(root, root, allFiles);
  allFiles.sort();

  const truncated = allFiles.length > MAX_FILES;
  const files = truncated ? allFiles.slice(0, MAX_FILES) : allFiles;
  const fileSet = new Set(files);
  const aliases = loadTsconfigAliases(root);

  // Build node map
  const nodeMap = new Map<string, CodeGraphNode>();
  for (const fullPath of files) {
    const rel = path.relative(root, fullPath);
    const ext = path.extname(fullPath);
    const label = path.basename(fullPath, ext);
    const parts = rel.split(path.sep);
    const directory = parts.length > 1 ? parts[0] : '';

    nodeMap.set(rel, {
      id: rel,
      label,
      fullPath,
      directory,
      ext,
      importedByCount: 0,
      importCount: 0,
    });
  }

  const links: CodeGraphLink[] = [];
  let resolvedImports = 0;
  let unresolvedImports = 0;

  // Parse imports for each file
  for (const fullPath of files) {
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    const importerRel = path.relative(root, fullPath);
    const importerNode = nodeMap.get(importerRel);
    if (!importerNode) continue;

    const imports = extractImports(content);
    const importerDir = path.dirname(fullPath);

    for (const importPath of imports) {
      const resolved = resolveImport(importPath, importerDir, aliases, fileSet);
      if (!resolved) {
        unresolvedImports++;
        continue;
      }

      resolvedImports++;
      const targetRel = path.relative(root, resolved);
      const targetNode = nodeMap.get(targetRel);
      if (!targetNode || targetRel === importerRel) continue;

      importerNode.importCount++;
      targetNode.importedByCount++;

      links.push({
        source: importerRel,
        target: targetRel,
        type: importPath.includes('import(') ? 'dynamic' : 'static',
      });
    }
  }

  const nodes = Array.from(nodeMap.values());
  const orphanFiles = nodes.filter(n => n.importCount === 0 && n.importedByCount === 0).length;

  return {
    nodes,
    links,
    stats: {
      totalFiles: allFiles.length,
      totalImports: resolvedImports + unresolvedImports,
      orphanFiles,
      resolvedImports,
      unresolvedImports,
      truncated,
    },
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    assertLocalOnly();

    const { searchParams } = new URL(request.url);
    const root = searchParams.get('root');

    if (!root) {
      return NextResponse.json({ error: 'root query param is required' }, { status: 400 });
    }
    if (!path.isAbsolute(root)) {
      return NextResponse.json({ error: 'root must be an absolute path' }, { status: 400 });
    }
    if (!root.startsWith('/Users/') && !root.startsWith('/home/')) {
      return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
    }

    try {
      const stat = fs.statSync(root);
      if (!stat.isDirectory()) {
        return NextResponse.json({ error: 'root must be a directory' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'root path does not exist' }, { status: 400 });
    }

    // Check cache
    const cached = cache.get(root);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const data = buildGraph(root);
    cache.set(root, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (err) {
    console.error('[vault/code-graph GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
