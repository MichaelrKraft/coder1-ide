/**
 * Git Watcher - File Change Detection for Branch Conflict Detection
 *
 * Monitors git working tree changes and emits file editing events via Socket.IO.
 * Uses `git diff --name-only` to detect which files are being modified on the
 * current branch. This works regardless of which editor the user is using.
 *
 * Events emitted via socket:
 *   vcs:file:opened   { teamId, filePath, branch }
 *   vcs:file:closed   { teamId, filePath }
 */

const { execSync } = require('child_process');
const path = require('path');
const logger = require('./logger');

// Files/patterns to ignore for conflict detection
const IGNORE_PATTERNS = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'node_modules/',
  '.next/',
  '.git/',
  'dist/',
  'build/',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.map',
  '.env',
  '.env.local',
];

// Binary file extensions to exclude
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.zip', '.tar', '.gz', '.bz2',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.exe', '.dll', '.so', '.dylib',
]);

class GitWatcher {
  /**
   * @param {Object} options
   * @param {Object} options.socket - Socket.IO client instance
   * @param {string} options.teamId - Team ID for event payloads
   * @param {string} [options.workingDir] - Git repo directory (defaults to cwd)
   * @param {number} [options.pollIntervalMs] - Poll interval in ms (default 5000)
   * @param {number} [options.debounceMs] - Debounce delay in ms (default 500)
   */
  constructor(options = {}) {
    this.socket = options.socket;
    this.teamId = options.teamId;
    this.workingDir = options.workingDir || process.cwd();
    this.pollIntervalMs = options.pollIntervalMs || 5000;
    this.debounceMs = options.debounceMs || 500;

    // Track currently known changed files
    this.trackedFiles = new Set();
    this.currentBranch = null;
    this.pollTimer = null;
    this.debounceTimer = null;
    this.isRunning = false;

    logger.info('GitWatcher initialized', {
      workingDir: this.workingDir,
      teamId: this.teamId,
      pollIntervalMs: this.pollIntervalMs,
    });
  }

  /**
   * Start watching for git changes
   */
  start() {
    if (this.isRunning) {
      logger.warn('GitWatcher already running');
      return;
    }

    // Verify this is a git repository
    if (!this._isGitRepo()) {
      logger.warn('GitWatcher: Not a git repository, disabling', {
        workingDir: this.workingDir,
      });
      return;
    }

    this.isRunning = true;
    this.currentBranch = this._getCurrentBranch();

    logger.info('GitWatcher started', {
      branch: this.currentBranch,
      workingDir: this.workingDir,
    });

    // Do initial scan
    this._poll();

    // Set up polling interval
    this.pollTimer = setInterval(() => this._poll(), this.pollIntervalMs);
  }

  /**
   * Stop watching
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Emit file:closed for all tracked files
    for (const filePath of this.trackedFiles) {
      this._emitFileClosed(filePath);
    }
    this.trackedFiles.clear();

    logger.info('GitWatcher stopped');
  }

  /**
   * Update the team ID (e.g., when user joins a different team)
   */
  setTeamId(teamId) {
    this.teamId = teamId;
  }

  /**
   * Poll git for changed files with debounce
   */
  _poll() {
    if (!this.isRunning) return;

    // Debounce rapid polls
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this._doPoll();
    }, this.debounceMs);
  }

  /**
   * Actual poll logic - detects file changes via git diff
   */
  _doPoll() {
    try {
      // Check if branch changed
      const branch = this._getCurrentBranch();
      if (branch !== this.currentBranch) {
        logger.info('GitWatcher: Branch changed', {
          from: this.currentBranch,
          to: branch,
        });
        // Close all tracked files on branch change, re-scan
        for (const filePath of this.trackedFiles) {
          this._emitFileClosed(filePath);
        }
        this.trackedFiles.clear();
        this.currentBranch = branch;
      }

      // Get currently changed files (staged + unstaged)
      const changedFiles = this._getChangedFiles();

      // Find newly changed files (opened)
      for (const filePath of changedFiles) {
        if (!this.trackedFiles.has(filePath)) {
          this.trackedFiles.add(filePath);
          this._emitFileOpened(filePath);
        }
      }

      // Find files no longer changed (closed)
      for (const filePath of this.trackedFiles) {
        if (!changedFiles.has(filePath)) {
          this.trackedFiles.delete(filePath);
          this._emitFileClosed(filePath);
        }
      }
    } catch (err) {
      logger.error('GitWatcher poll error', { error: err.message });
    }
  }

  /**
   * Get set of changed files using git diff
   * Combines staged and unstaged changes
   */
  _getChangedFiles() {
    const files = new Set();

    try {
      // Unstaged changes
      const unstaged = this._exec('git diff --name-only');
      for (const line of unstaged.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !this._shouldIgnore(trimmed)) {
          files.add(trimmed);
        }
      }
    } catch {
      // git diff can fail if no commits yet
    }

    try {
      // Staged changes
      const staged = this._exec('git diff --cached --name-only');
      for (const line of staged.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !this._shouldIgnore(trimmed)) {
          files.add(trimmed);
        }
      }
    } catch {
      // ignore
    }

    try {
      // Untracked files (new files not yet added)
      const untracked = this._exec('git ls-files --others --exclude-standard');
      for (const line of untracked.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !this._shouldIgnore(trimmed)) {
          files.add(trimmed);
        }
      }
    } catch {
      // ignore
    }

    return files;
  }

  /**
   * Check if a file path should be ignored
   */
  _shouldIgnore(filePath) {
    // Check binary extensions
    const ext = path.extname(filePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) return true;

    // Check ignore patterns
    for (const pattern of IGNORE_PATTERNS) {
      if (pattern.endsWith('/')) {
        // Directory pattern
        if (filePath.startsWith(pattern) || filePath.includes('/' + pattern)) {
          return true;
        }
      } else if (pattern.startsWith('*.')) {
        // Extension pattern
        const patternExt = pattern.slice(1); // e.g., ".log"
        if (filePath.endsWith(patternExt)) {
          return true;
        }
      } else {
        // Exact match or contains
        if (filePath === pattern || filePath.endsWith('/' + pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Emit vcs:file:opened event
   */
  _emitFileOpened(filePath) {
    if (!this.socket || !this.teamId) return;

    const payload = {
      teamId: this.teamId,
      filePath,
      branch: this.currentBranch || 'unknown',
    };

    this.socket.emit('vcs:file:opened', payload);
    logger.debug('GitWatcher: file opened', payload);
  }

  /**
   * Emit vcs:file:closed event
   */
  _emitFileClosed(filePath) {
    if (!this.socket || !this.teamId) return;

    const payload = {
      teamId: this.teamId,
      filePath,
    };

    this.socket.emit('vcs:file:closed', payload);
    logger.debug('GitWatcher: file closed', payload);
  }

  /**
   * Get current git branch name
   */
  _getCurrentBranch() {
    try {
      return this._exec('git rev-parse --abbrev-ref HEAD').trim();
    } catch {
      return null;
    }
  }

  /**
   * Check if working directory is a git repo
   */
  _isGitRepo() {
    try {
      this._exec('git rev-parse --is-inside-work-tree');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute a git command synchronously
   */
  _exec(command) {
    return execSync(command, {
      cwd: this.workingDir,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }
}

module.exports = GitWatcher;
