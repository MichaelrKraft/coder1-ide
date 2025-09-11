/**
 * Context File Watcher Service
 * Automatically detects file changes and updates context
 */

// Server-only import to prevent client-side bundling
const chokidar = typeof window === 'undefined' ? require('chokidar') : null;
import { contextProcessor } from './context-processor';
import { logger } from '@/lib/logger';

interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: number;
  stats?: any;
}

class ContextFileWatcher {
  private watchers: Map<string, any> = new Map();
  private changeBuffer: FileChangeEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isWatching = false;

  /**
   * Start watching a project directory for file changes
   */
  async watchProject(projectPath: string): Promise<void> {
    try {
      // Don't watch the same path twice
      if (this.watchers.has(projectPath)) {
        logger.debug(`Already watching project: ${projectPath}`);
        return;
      }

      // Watch only specific directories to avoid file descriptor issues
      const watchPaths = [
        `${projectPath}/src`,
        `${projectPath}/coder1-ide-next/app`,
        `${projectPath}/coder1-ide-next/components`,
        `${projectPath}/coder1-ide-next/lib`,
        `${projectPath}/coder1-ide-next/services`,
        `${projectPath}/CANONICAL`
      ].filter(path => {
        // Only watch paths that actually exist
        try {
          require('fs').statSync(path);
          return true;
        } catch {
          return false;
        }
      });

      logger.debug(`📁 Starting file watcher for specific directories: ${watchPaths.length} paths`);

      // Safety check - only run on server side
      if (!chokidar) {
        logger.warn('⚠️ Chokidar not available - file watching disabled on client side');
        return;
      }

      const watcher = chokidar.watch(watchPaths, {
        persistent: true,
        ignoreInitial: true,
        ignored: [
          // Git directories and files (critical for EMFILE fix)
          '**/.git/**',
          '**/.git',
          
          // Node.js
          '**/node_modules/**',
          '**/.next/**',
          '**/dist/**',
          '**/build/**',
          
          // OS files
          '**/.DS_Store',
          '**/Thumbs.db',
          
          // IDE files
          '**/.vscode/**',
          '**/.idea/**',
          
          // Logs and temp files
          '**/*.log',
          '**/tmp/**',
          '**/temp/**',
          
          // Database files
          '**/*.db',
          '**/*.sqlite',
          
          // Large assets
          '**/*.jpg',
          '**/*.jpeg',
          '**/*.png',
          '**/*.gif',
          '**/*.ico',
          '**/*.mp4',
          '**/*.mp3',
          
          // Additional ignore patterns for stability
          '**/summaries/**',
          '**/.cache/**',
          '**/coverage/**'
        ],
        
        // Performance settings for stability
        usePolling: false,
        interval: 1000,
        binaryInterval: 1000,
        alwaysStat: false,
        depth: 8, // Reduced depth to prevent excessive file watching
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100
        }
      });

      // Set up event handlers
      watcher
        .on('add', (path: any, stats: any) => this.handleFileChange('add', path, stats))
        .on('change', (path: any, stats: any) => this.handleFileChange('change', path, stats))
        .on('unlink', (path: any) => this.handleFileChange('unlink', path))
        .on('error', (error: any) => {
          logger.error(`Context file watcher error for ${projectPath}:`, error);
        })
        .on('ready', () => {
          logger.debug(`📁 Context file watcher ready for: ${projectPath}`);
          this.isWatching = true;
        });

      this.watchers.set(projectPath, watcher);
      
      logger.debug(`🔍 Started watching project for context: ${projectPath}`);
    } catch (error) {
      logger.error('Failed to start context file watcher:', error);
      throw error;
    }
  }

  /**
   * Stop watching a project directory
   */
  async stopWatchingProject(projectPath: string): Promise<void> {
    const watcher = this.watchers.get(projectPath);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(projectPath);
      logger.debug(`📴 Stopped watching project: ${projectPath}`);
    }
  }

  /**
   * Stop all watchers
   */
  async stopAll(): Promise<void> {
    const closePromises = Array.from(this.watchers.values()).map(watcher => watcher.close());
    await Promise.all(closePromises);
    this.watchers.clear();
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    this.isWatching = false;
    logger.debug('📴 All context file watchers stopped');
  }

  /**
   * Handle file change events
   */
  private handleFileChange(type: 'add' | 'change' | 'unlink', path: string, stats?: any): void {
    try {
      // Filter out irrelevant files
      if (this.shouldIgnoreFile(path)) {
        return;
      }

      const event: FileChangeEvent = {
        type,
        path,
        timestamp: Date.now(),
        stats
      };

      // Add to buffer
      this.changeBuffer.push(event);

      // Log significant changes
      if (this.isSignificantFile(path)) {
        logger.debug(`📝 File ${type}: ${path}`);
      }

      // Schedule flush
      this.scheduleFlush();
    } catch (error) {
      logger.error('Error handling file change:', error);
    }
  }

  /**
   * Schedule flushing the change buffer
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Flush immediately for important files, or after 2 seconds for others
    const hasImportantChanges = this.changeBuffer.some(event => 
      this.isSignificantFile(event.path)
    );

    const delay = hasImportantChanges ? 500 : 2000;

    this.flushTimer = setTimeout(() => {
      this.flushChanges();
    }, delay);
  }

  /**
   * Flush accumulated file changes to context processor
   */
  private async flushChanges(): Promise<void> {
    if (this.changeBuffer.length === 0) return;

    const changes = this.changeBuffer.splice(0); // Clear buffer
    this.flushTimer = undefined;

    try {
      // Group changes by type for better context
      const summary = this.summarizeChanges(changes);
      
      // Create terminal chunks representing file activity
      const chunks = changes.map(change => ({
        timestamp: change.timestamp,
        type: 'terminal_output' as const,
        content: this.formatFileChangeMessage(change),
        sessionId: 'file_watcher',
        fileContext: [change.path],
        commandContext: `${change.type}_file`
      }));

      // Also add a summary chunk
      if (summary.significant > 0) {
        chunks.push({
          timestamp: Date.now(),
          type: 'terminal_output' as const,
          content: `File activity summary: ${summary.total} changes (${summary.significant} significant)`,
          sessionId: 'file_watcher',
          fileContext: summary.paths,
          commandContext: 'file_activity_summary'
        });
      }

      // Send to context processor
      await contextProcessor.processChunk(chunks);

      logger.debug(`🔄 Processed ${changes.length} file changes for context learning`);
    } catch (error) {
      logger.error('Failed to flush file changes to context:', error);
    }
  }

  /**
   * Summarize file changes for context
   */
  private summarizeChanges(changes: FileChangeEvent[]): {
    total: number;
    significant: number;
    paths: string[];
    types: Record<string, number>;
  } {
    const paths = new Set<string>();
    const types: Record<string, number> = { add: 0, change: 0, unlink: 0 };
    let significant = 0;

    changes.forEach(change => {
      paths.add(change.path);
      types[change.type] = (types[change.type] || 0) + 1;
      
      if (this.isSignificantFile(change.path)) {
        significant++;
      }
    });

    return {
      total: changes.length,
      significant,
      paths: Array.from(paths),
      types
    };
  }

  /**
   * Format file change for context processing
   */
  private formatFileChangeMessage(change: FileChangeEvent): string {
    const action = {
      add: 'Created',
      change: 'Modified',
      unlink: 'Deleted'
    }[change.type];

    const relativePath = change.path.replace(process.cwd() + '/', '');
    return `${action}: ${relativePath}`;
  }

  /**
   * Check if file should be ignored
   */
  private shouldIgnoreFile(path: string): boolean {
    const ignorePatterns = [
      /\.log$/,
      /\.cache$/,
      /\.tmp$/,
      /\.swp$/,
      /~$/,
      /\.DS_Store$/,
      /node_modules/,
      /\.git/,
      /\.next/,
      /dist/,
      /build/,
      /coverage/
    ];

    return ignorePatterns.some(pattern => pattern.test(path));
  }

  /**
   * Check if file is significant for context learning
   */
  private isSignificantFile(path: string): boolean {
    const significantExtensions = [
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.java', '.cpp', '.c',
      '.html', '.css', '.scss',
      '.json', '.yml', '.yaml',
      '.md', '.txt',
      '.sql', '.prisma'
    ];

    return significantExtensions.some(ext => path.toLowerCase().endsWith(ext));
  }

  /**
   * Get watcher status
   */
  getStatus(): {
    isWatching: boolean;
    watchedPaths: string[];
    bufferedChanges: number;
  } {
    return {
      isWatching: this.isWatching,
      watchedPaths: Array.from(this.watchers.keys()),
      bufferedChanges: this.changeBuffer.length
    };
  }
}

// Export singleton instance
export const contextFileWatcher = new ContextFileWatcher();
export default contextFileWatcher;