import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Resolve ~ in vault path
 */
export function expandVaultPath(vaultPath: string): string {
  if (vaultPath.startsWith('~/')) {
    return path.join(os.homedir(), vaultPath.slice(2));
  }
  return vaultPath;
}

/**
 * Validate that requestedPath is safely inside vaultRoot.
 * Throws if path traversal or symlink escape is detected.
 * Returns the resolved absolute path.
 */
export function validateVaultPath(requestedPath: string, vaultRoot: string): string {
  const normalizedRoot = path.resolve(expandVaultPath(vaultRoot));
  const resolved = path.resolve(normalizedRoot, requestedPath);

  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    throw new Error('Path traversal detected');
  }

  // Block symlinks that point outside the vault
  try {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink()) {
      const target = fs.realpathSync(resolved);
      if (!target.startsWith(normalizedRoot)) {
        throw new Error('Symlink points outside vault');
      }
    }
  } catch (err: unknown) {
    // File doesn't exist yet — that's fine (creating new note)
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  return resolved;
}

/**
 * Guard: vault routes must never run on Render (remote) deployments.
 * Call at the top of every vault API route handler.
 */
export function assertLocalOnly(): void {
  if (process.env.RENDER_SERVICE_NAME) {
    throw new Error('Vault is local-only and cannot run on remote deployments');
  }
}

/**
 * Ensure a directory exists, creating it (and parents) if needed.
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
