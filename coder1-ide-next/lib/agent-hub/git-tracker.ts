import { execSync } from 'child_process';
import path from 'path';

function assertAbsolutePath(workspacePath: string): void {
  if (!path.isAbsolute(workspacePath)) {
    throw new Error(`Invalid workspace path: must be absolute, got "${workspacePath}"`);
  }
}

function runGit(args: string, workspacePath: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd: workspacePath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[git-tracker] git ${args} failed: ${message}`);
    return '';
  }
}

export async function getDiffForWorkspace(workspacePath: string): Promise<string> {
  assertAbsolutePath(workspacePath);
  const staged = runGit('diff --cached', workspacePath);
  const unstaged = runGit('diff', workspacePath);
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
  runGit('add -A', workspacePath);
  runGit(`commit -m "${message.replace(/"/g, '\\"')}"`, workspacePath);
}

export async function rejectRun(workspacePath: string): Promise<void> {
  assertAbsolutePath(workspacePath);
  // Destructive — caller must confirm before invoking
  runGit('checkout -- .', workspacePath);
  runGit('clean -fd', workspacePath);
}

export async function getChangedFiles(workspacePath: string): Promise<string[]> {
  assertAbsolutePath(workspacePath);
  const output = runGit('status --porcelain', workspacePath);
  if (!output.trim()) return [];
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
}
