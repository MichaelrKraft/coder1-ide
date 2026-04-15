import { NextResponse } from 'next/server';
import { assertLocalOnly } from '@/lib/vault-security';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ProjectEntry {
  name: string;    // from package.json name or directory name
  path: string;    // absolute path
}

const SKIP_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', '.git', 'coverage',
  '.turbo', '.cache', 'out', '.vercel', '__pycache__', 'vendor',
]);

// Scan one level deep for package.json files under a given directory
function scanForProjects(dir: string): ProjectEntry[] {
  const results: ProjectEntry[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const pkgPath = path.join(fullPath, 'package.json');

    if (fs.existsSync(pkgPath)) {
      let name = entry.name;
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name) name = pkg.name;
      } catch { /* use directory name */ }
      results.push({ name, path: fullPath });
    }
  }

  return results;
}

export async function GET() {
  try {
    assertLocalOnly();

    const home = os.homedir();
    const projects: ProjectEntry[] = [];
    const seen = new Set<string>();

    const addProject = (entry: ProjectEntry) => {
      if (!seen.has(entry.path)) {
        seen.add(entry.path);
        projects.push(entry);
      }
    };

    // 1. Check if home itself has a package.json (monorepo root)
    if (fs.existsSync(path.join(home, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(home, 'package.json'), 'utf-8'));
      addProject({ name: pkg.name ?? 'home', path: home });
    }

    // 2. Scan well-known development directories
    const scanRoots = [
      path.join(home, 'autonomous_vibe_interface'),
      path.join(home, 'Desktop', 'Businesses'),
      path.join(home, 'Desktop'),
      path.join(home, 'Documents'),
      path.join(home, 'Projects'),
      path.join(home, 'Developer'),
      path.join(home, 'dev'),
      path.join(home, 'code'),
      path.join(home, 'src'),
      home,
    ];

    for (const root of scanRoots) {
      if (!fs.existsSync(root)) continue;
      for (const entry of scanForProjects(root)) {
        addProject(entry);
      }
      // Also check if the root itself is a project
      if (fs.existsSync(path.join(root, 'package.json'))) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
          addProject({ name: pkg.name ?? path.basename(root), path: root });
        } catch { /* skip */ }
      }
    }

    // Sort: alphabetically by name
    projects.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ projects });
  } catch (err) {
    console.error('[vault/projects GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
