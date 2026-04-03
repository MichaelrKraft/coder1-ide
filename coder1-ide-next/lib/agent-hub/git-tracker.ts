import { execFileSync } from 'child_process';
import fs from 'fs';
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

export async function createWorktreeForRun(
  workspacePath: string,
  runId: string
): Promise<string> {
  assertAbsolutePath(workspacePath);

  // Verify workspace is a git repo
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], {
      cwd: workspacePath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(`Workspace is not a git repository: ${workspacePath}`);
  }

  const worktreeDir = path.join(
    process.env.HOME || '/tmp',
    '.coder1',
    'agent-worktrees'
  );
  const worktreePath = path.join(worktreeDir, runId);
  const branchName = `agent/run-${runId}`;

  // Ensure parent directory exists
  fs.mkdirSync(worktreeDir, { recursive: true });

  // Create the worktree
  execFileSync('git', ['worktree', 'add', worktreePath, '-b', branchName], {
    cwd: workspacePath,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return worktreePath;
}

export async function removeWorktree(worktreePath: string): Promise<void> {
  if (!worktreePath) return;
  assertAbsolutePath(worktreePath);

  // Check if path exists before trying to remove
  if (!fs.existsSync(worktreePath)) {
    console.warn(
      `[git-tracker] Worktree path does not exist, skipping removal: ${worktreePath}`
    );
    return;
  }

  // Find the main repo from the worktree's .git file
  try {
    const gitFileContent = fs.readFileSync(
      path.join(worktreePath, '.git'),
      'utf8'
    );
    // .git file contains "gitdir: /path/to/main/.git/worktrees/runId"
    const gitdirMatch = gitFileContent.match(/gitdir:\s*(.+)/);
    if (gitdirMatch) {
      // Derive main repo path: go up from .git/worktrees/{name} → .git → repo root
      const worktreesDir = path.dirname(gitdirMatch[1].trim());
      const gitDir = path.dirname(worktreesDir);
      const repoRoot = path.dirname(gitDir);

      execFileSync('git', ['worktree', 'remove', worktreePath, '--force'], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return;
    }
  } catch {
    // Fall through to manual cleanup
  }

  // Fallback: just remove the directory
  console.warn(
    `[git-tracker] Could not remove worktree cleanly, removing directory: ${worktreePath}`
  );
  fs.rmSync(worktreePath, { recursive: true, force: true });
}

export async function mergeWorktreeBranch(
  workspacePath: string,
  runId: string,
  taskTitle: string
): Promise<void> {
  assertAbsolutePath(workspacePath);
  const branchName = `agent/run-${runId}`;
  const message = `Agent: ${taskTitle} (Run ${runId})`;

  // Merge the worktree branch into the current branch (squash)
  try {
    execFileSync('git', ['merge', '--squash', branchName], {
      cwd: workspacePath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Merge conflict — resolve manually in ${workspacePath}. Git error: ${msg}`
    );
  }

  // Check if there's anything to commit after the merge
  const status = execFileSync('git', ['status', '--porcelain'], {
    cwd: workspacePath,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (!status.trim()) {
    throw new Error(
      'Nothing to commit after merge — agent branch had no changes'
    );
  }

  // Commit the squash merge
  execFileSync('git', ['commit', '-m', message], {
    cwd: workspacePath,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Clean up the branch reference
  try {
    execFileSync('git', ['branch', '-D', branchName], {
      cwd: workspacePath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Branch cleanup is best-effort
  }
}
