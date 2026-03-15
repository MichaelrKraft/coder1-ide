/**
 * VaultFileWatcher — watches the vault directory for file changes
 * and triggers vault re-indexing.
 *
 * Server-side only. Never import this in client components.
 */

// Guard: this module must never run in the browser
if (typeof window !== 'undefined') {
  throw new Error('vault-file-watcher must only be imported server-side');
}

import chokidar, { FSWatcher } from 'chokidar';
import { expandVaultPath } from './vault-security';

type ChangeType = 'add' | 'change' | 'unlink';

interface ChangeEvent {
  type: ChangeType;
  path: string;       // absolute path
  timestamp: number;
}

type ChangeHandler = (events: ChangeEvent[]) => void;

export class VaultFileWatcher {
  private watcher: FSWatcher | null = null;
  private vaultRoot: string;
  private pendingEvents: ChangeEvent[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 500;
  private handlers: ChangeHandler[] = [];

  constructor(vaultPath: string) {
    this.vaultRoot = expandVaultPath(vaultPath);
  }

  start(): void {
    if (this.watcher) return;

    this.watcher = chokidar.watch(this.vaultRoot, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    const handle = (type: ChangeType) => (filePath: string) => {
      if (!filePath.endsWith('.md')) return;
      this.pendingEvents.push({ type, path: filePath, timestamp: Date.now() });
      this.scheduleDrain();
    };

    this.watcher
      .on('add', handle('add'))
      .on('change', handle('change'))
      .on('unlink', handle('unlink'))
      .on('error', (err) => console.error('[VaultFileWatcher] error:', err));
  }

  stop(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.watcher?.close();
    this.watcher = null;
    this.pendingEvents = [];
  }

  onChange(handler: ChangeHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  private scheduleDrain(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const events = [...this.pendingEvents];
      this.pendingEvents = [];
      this.handlers.forEach(h => h(events));
    }, this.DEBOUNCE_MS);
  }
}

// Module-level singleton per vault path
const watchers = new Map<string, VaultFileWatcher>();

export function getVaultFileWatcher(vaultPath: string): VaultFileWatcher {
  const expanded = expandVaultPath(vaultPath);
  if (!watchers.has(expanded)) {
    const w = new VaultFileWatcher(vaultPath);
    w.start();
    watchers.set(expanded, w);
  }
  return watchers.get(expanded)!;
}
