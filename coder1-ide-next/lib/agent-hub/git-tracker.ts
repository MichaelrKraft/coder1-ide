import { execFileSync } from 'child_process';
import path from 'path';

function assertAbsolutePath(workspacePath: string): void {
  if (!path.isAbsolute(workspacePath)) {
    throw new Error(`Invalid workspace path: must be absolute, got "${workspacePath}"`);
  }
}

function runGit(args: string[], workspacePath: string): string {
  try {
    return execFileSync('git', args, {
      cwd: workspacePath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[git-tracker] git ${args.join(' ')} failed: ${message}`);
    return '';
  }
}

export async function getDiffForWorkspace(workspacePath: string): Promise<string> {
  assertAbsolutePath(workspacePath);
  const staged = runGit(['diff', '--cached'], workspacePath);
  const unstaged = runGit(['diff'], workspacePath);
  return [staged, unstaged].filter(Boolean).join('\n');
}

export async function captureFinalDiff(workspacePath: string): Promise<string> {
  return getDiffForWorkspace(workspacePath);
}

export async function commitApprovedRun(
  workspacePath: string,
  taskTitle: string,
  runId: string
): Promise<void> {
  assertAbsolutePath(workspacePath);
  const message = `Agent: ${taskTitle} (Run ${runId})`;

  // Stage all changes first
  execFileSync('git', ['add', '-A'], {
    cwd: workspacePath,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Check if there is anything staged to commit
  const status = execFileSync('git', ['status', '--porcelain'], {
    cwd: workspacePath,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (!status.trim()) {
    throw new Error('Nothing to commit — agent made no file changes');
  }

  // Commit — let any error propagate to the caller
  execFileSync('git', ['commit', '-m', message], {
    cwd: workspacePath,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

export async function rejectRun(workspacePath: string): Promise<void> {
  assertAbsolutePath(workspacePath);
  // Destructive — caller must confirm before invoking
  runGit(['checkout', '--', '.'], workspacePath);
  runGit(['clean', '-fd'], workspacePath);
}

export async function getChangedFiles(workspacePath: string): Promise<string[]> {
  assertAbsolutePath(workspacePath);
  const output = runGit(['status', '--porcelain'], workspacePath);
  if (!output.trim()) return [];
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
}
