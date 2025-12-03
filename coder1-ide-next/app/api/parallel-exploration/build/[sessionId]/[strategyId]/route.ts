import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const WORK_TREE_BASE = '/tmp/coder1-explorations';
const BUILD_TIMEOUT = 120000; // 2 minutes

// Track build status per strategy
const buildStatus = new Map<string, {
  status: 'pending' | 'building' | 'success' | 'error';
  progress: string;
  error?: string;
  builtDir?: string;
}>();

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; strategyId: string } }
) {
  const { sessionId, strategyId } = params;
  const key = `${sessionId}/${strategyId}`;

  const status = buildStatus.get(key);
  if (!status) {
    return NextResponse.json({ status: 'not-started' });
  }

  return NextResponse.json(status);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string; strategyId: string } }
) {
  const { sessionId, strategyId } = params;
  const key = `${sessionId}/${strategyId}`;

  console.log(`[Build API] Starting build for ${key}`);

  // Check if already building or built
  const existingStatus = buildStatus.get(key);
  if (existingStatus?.status === 'building') {
    return NextResponse.json({
      success: false,
      error: 'Build already in progress',
      status: existingStatus
    });
  }

  if (existingStatus?.status === 'success' && existingStatus.builtDir) {
    // Already built, return the cached result
    return NextResponse.json({
      success: true,
      status: existingStatus,
      previewPath: existingStatus.builtDir
    });
  }

  const strategyDir = path.join(WORK_TREE_BASE, sessionId, strategyId);

  // Verify directory exists
  try {
    await fs.access(strategyDir);
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Strategy directory not found'
    }, { status: 404 });
  }

  // Set initial status
  buildStatus.set(key, {
    status: 'building',
    progress: 'Starting build process...'
  });

  try {
    // Check for package.json
    const packageJsonPath = path.join(strategyDir, 'package.json');
    let hasPackageJson = false;

    try {
      await fs.access(packageJsonPath);
      hasPackageJson = true;
    } catch {
      // No package.json - might be static files only
    }

    let builtDir = strategyDir;

    if (hasPackageJson) {
      // Read package.json to determine build command
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};

      buildStatus.set(key, {
        status: 'building',
        progress: 'Installing dependencies...'
      });

      // Install dependencies
      console.log(`[Build API] Running npm install in ${strategyDir}`);
      try {
        await execAsync('npm install --legacy-peer-deps', {
          cwd: strategyDir,
          timeout: BUILD_TIMEOUT,
          env: { ...process.env, CI: 'true' }
        });
      } catch (installError: any) {
        console.error(`[Build API] npm install failed:`, installError.stderr || installError.message);
        buildStatus.set(key, {
          status: 'error',
          progress: 'Failed',
          error: `npm install failed: ${installError.stderr || installError.message}`
        });
        return NextResponse.json({
          success: false,
          error: 'npm install failed',
          details: installError.stderr || installError.message
        }, { status: 500 });
      }

      // Determine build command
      let buildCommand = 'npm run build';
      if (scripts.build) {
        buildCommand = 'npm run build';
      } else if (scripts.export) {
        buildCommand = 'npm run export';
      } else {
        // No build script - might be simple JS/TS that doesn't need building
        console.log(`[Build API] No build script found, skipping build step`);
        buildStatus.set(key, {
          status: 'success',
          progress: 'Complete (no build needed)',
          builtDir: strategyDir
        });
        return NextResponse.json({
          success: true,
          status: buildStatus.get(key),
          previewPath: strategyDir
        });
      }

      buildStatus.set(key, {
        status: 'building',
        progress: 'Building project...'
      });

      console.log(`[Build API] Running ${buildCommand} in ${strategyDir}`);
      try {
        await execAsync(buildCommand, {
          cwd: strategyDir,
          timeout: BUILD_TIMEOUT,
          env: { ...process.env, CI: 'true', NODE_ENV: 'production' }
        });
      } catch (buildError: any) {
        console.error(`[Build API] Build failed:`, buildError.stderr || buildError.message);
        buildStatus.set(key, {
          status: 'error',
          progress: 'Failed',
          error: `Build failed: ${buildError.stderr || buildError.message}`
        });
        return NextResponse.json({
          success: false,
          error: 'Build failed',
          details: buildError.stderr || buildError.message
        }, { status: 500 });
      }

      // Find the build output directory (dist, build, .next/out, out)
      const possibleDirs = ['dist', 'build', 'out', '.next/out'];
      for (const dir of possibleDirs) {
        const checkDir = path.join(strategyDir, dir);
        try {
          const stat = await fs.stat(checkDir);
          if (stat.isDirectory()) {
            builtDir = checkDir;
            break;
          }
        } catch {
          // Directory doesn't exist, try next
        }
      }
    }

    // Check if index.html exists in the built directory
    const indexPath = path.join(builtDir, 'index.html');
    try {
      await fs.access(indexPath);
    } catch {
      // Try looking for any HTML file
      const files = await fs.readdir(builtDir);
      const htmlFile = files.find(f => f.endsWith('.html'));
      if (!htmlFile) {
        buildStatus.set(key, {
          status: 'error',
          progress: 'Failed',
          error: 'No HTML file found in build output'
        });
        return NextResponse.json({
          success: false,
          error: 'No HTML file found in build output',
          files: files.slice(0, 10) // Show first 10 files for debugging
        }, { status: 500 });
      }
    }

    // Calculate relative path from strategy dir to built dir
    const relativeBuildPath = path.relative(strategyDir, builtDir);

    buildStatus.set(key, {
      status: 'success',
      progress: 'Build complete!',
      builtDir: relativeBuildPath || '.'
    });

    console.log(`[Build API] Build successful for ${key}, output: ${builtDir}`);

    return NextResponse.json({
      success: true,
      status: buildStatus.get(key),
      previewPath: relativeBuildPath || '.'
    });

  } catch (error) {
    console.error(`[Build API] Unexpected error:`, error);
    buildStatus.set(key, {
      status: 'error',
      progress: 'Failed',
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({
      success: false,
      error: 'Build failed unexpectedly',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
