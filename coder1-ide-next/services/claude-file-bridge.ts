/**
 * Claude File Bridge Service
 * Manages temporary files for Claude Code CLI integration
 * Enables drag-and-dropped files to be accessible by Claude CLI sessions
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

export interface BridgedFile {
  id: string;
  originalName: string;
  tempPath: string;
  type: string;
  size: number;
  created: Date;
  accessed: Date;
  content?: string; // For text files/PDFs
  metadata?: any;
}

export interface FileSystemBridgeOptions {
  maxFileSize?: number;
  maxFiles?: number;
  cleanupIntervalMs?: number;
  maxAgeMs?: number;
}

class ClaudeFileBridge {
  private tempDir: string;
  private bridgedFiles = new Map<string, BridgedFile>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private options: Required<FileSystemBridgeOptions>;

  constructor(options: FileSystemBridgeOptions = {}) {
    this.options = {
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      maxFiles: 100, // Max 100 files at once
      cleanupIntervalMs: 5 * 60 * 1000, // Cleanup every 5 minutes
      maxAgeMs: 2 * 60 * 60 * 1000, // Files expire after 2 hours
      ...options
    };

    // Create temporary directory for bridged files
    this.tempDir = path.join(os.tmpdir(), 'coder1-file-bridge');
    this.initialize();
  }

  private async initialize() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log('🌉 Claude File Bridge initialized:', this.tempDir);

      // Start cleanup interval
      this.startCleanupInterval();
    } catch (error) {
      console.error('❌ Failed to initialize Claude File Bridge:', error);
      throw error;
    }
  }

  private startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredFiles().catch(console.error);
    }, this.options.cleanupIntervalMs);
  }

  /**
   * Bridge a File object to the filesystem for Claude CLI access
   */
  async bridgeFile(file: File, content?: string, metadata?: any): Promise<BridgedFile> {
    if (file.size > this.options.maxFileSize) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max ${this.options.maxFileSize / 1024 / 1024}MB)`);
    }

    if (this.bridgedFiles.size >= this.options.maxFiles) {
      // Clean up oldest files to make space
      await this.cleanupOldestFiles(Math.ceil(this.options.maxFiles * 0.2)); // Remove 20%
    }

    const fileId = uuidv4();
    const fileExtension = path.extname(file.name) || this.getExtensionFromMimeType(file.type);
    const tempFileName = `${fileId}${fileExtension}`;
    const tempPath = path.join(this.tempDir, tempFileName);

    try {
      // Write file to temporary location
      const buffer = await this.fileToBuffer(file);
      await fs.writeFile(tempPath, buffer);

      const bridgedFile: BridgedFile = {
        id: fileId,
        originalName: file.name,
        tempPath,
        type: file.type,
        size: file.size,
        created: new Date(),
        accessed: new Date(),
        content,
        metadata
      };

      this.bridgedFiles.set(fileId, bridgedFile);

      console.log(`🔗 File bridged: ${file.name} -> ${tempPath}`);
      return bridgedFile;
    } catch (error) {
      console.error(`❌ Failed to bridge file ${file.name}:`, error);
      throw error;
    }
  }

  /**
   * Bridge multiple files at once
   */
  async bridgeFiles(files: { file: File; content?: string; metadata?: any }[]): Promise<BridgedFile[]> {
    const results: BridgedFile[] = [];

    for (const { file, content, metadata } of files) {
      try {
        const bridgedFile = await this.bridgeFile(file, content, metadata);
        results.push(bridgedFile);
      } catch (error) {
        console.error(`Failed to bridge ${file.name}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Get a bridged file by ID
   */
  getBridgedFile(id: string): BridgedFile | undefined {
    const file = this.bridgedFiles.get(id);
    if (file) {
      file.accessed = new Date();
    }
    return file;
  }

  /**
   * Get all bridged files
   */
  getAllBridgedFiles(): BridgedFile[] {
    return Array.from(this.bridgedFiles.values());
  }

  /**
   * Generate Claude CLI command string with file paths
   */
  generateClaudeCommand(fileIds: string[], userMessage?: string): string {
    const filePaths = fileIds
      .map(id => this.getBridgedFile(id)?.tempPath)
      .filter(path => path)
      .map(path => `"${path}"`)
      .join(' ');

    const message = userMessage || 'Please analyze these files';
    
    return `claude ${filePaths} "${message}"`;
  }

  /**
   * Generate a summary for terminal display
   */
  generateFilesSummary(fileIds: string[]): string {
    const files = fileIds
      .map(id => this.getBridgedFile(id))
      .filter(file => file);

    if (files.length === 0) return 'No files available';

    let summary = `📎 ${files.length} file(s) ready for Claude CLI:\n`;
    
    files.forEach(file => {
      const sizeKB = (file.size / 1024).toFixed(1);
      const icon = this.getFileIcon(file.type);
      summary += `  ${icon} ${file.originalName} (${sizeKB}KB)\n`;
      summary += `     Path: ${file.tempPath}\n`;
    });

    return summary;
  }

  /**
   * Remove a bridged file
   */
  async removeBridgedFile(id: string): Promise<boolean> {
    const file = this.bridgedFiles.get(id);
    if (!file) return false;

    try {
      await fs.unlink(file.tempPath);
      this.bridgedFiles.delete(id);
      console.log(`🗑️  Removed bridged file: ${file.originalName}`);
      return true;
    } catch (error) {
      console.error(`Failed to remove bridged file ${file.originalName}:`, error);
      return false;
    }
  }

  /**
   * Clean up expired files
   */
  private async cleanupExpiredFiles(): Promise<void> {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, file] of this.bridgedFiles) {
      if (now - file.accessed.getTime() > this.options.maxAgeMs) {
        expiredIds.push(id);
      }
    }

    if (expiredIds.length > 0) {
      console.log(`🧹 Cleaning up ${expiredIds.length} expired bridged files`);
      for (const id of expiredIds) {
        await this.removeBridgedFile(id);
      }
    }
  }

  /**
   * Clean up oldest files to make space
   */
  private async cleanupOldestFiles(count: number): Promise<void> {
    const files = Array.from(this.bridgedFiles.values())
      .sort((a, b) => a.accessed.getTime() - b.accessed.getTime())
      .slice(0, count);

    console.log(`🧹 Cleaning up ${files.length} oldest bridged files to make space`);
    
    for (const file of files) {
      await this.removeBridgedFile(file.id);
    }
  }

  /**
   * Helper: Convert File to Buffer
   */
  private fileToBuffer(file: File): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(Buffer.from(reader.result));
        } else {
          reject(new Error('Failed to convert file to buffer'));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Helper: Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'application/json': '.json',
      'application/javascript': '.js',
      'text/javascript': '.js',
      'application/typescript': '.ts',
      'text/typescript': '.ts',
      'text/html': '.html',
      'text/css': '.css',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };

    return mimeMap[mimeType] || '';
  }

  /**
   * Helper: Get file icon for display
   */
  private getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) return '📜';
    if (mimeType.includes('json')) return '📋';
    if (mimeType.includes('html')) return '🌐';
    if (mimeType.includes('css')) return '🎨';
    return '📄';
  }

  /**
   * Shutdown the service and clean up all files
   */
  async shutdown(): Promise<void> {
    console.log('🌉 Shutting down Claude File Bridge...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Remove all bridged files
    const ids = Array.from(this.bridgedFiles.keys());
    for (const id of ids) {
      await this.removeBridgedFile(id);
    }

    // Remove temp directory if empty
    try {
      await fs.rmdir(this.tempDir);
    } catch {
      // Directory might not be empty or might not exist
    }

    console.log('🌉 Claude File Bridge shutdown complete');
  }

  /**
   * Get bridge statistics
   */
  getStats() {
    const files = Array.from(this.bridgedFiles.values());
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    return {
      totalFiles: files.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      tempDir: this.tempDir,
      oldestFile: files.length > 0 ? Math.min(...files.map(f => f.created.getTime())) : null,
      newestFile: files.length > 0 ? Math.max(...files.map(f => f.created.getTime())) : null,
    };
  }
}

// Export singleton instance
export const claudeFileBridge = new ClaudeFileBridge({
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 50, // Max 50 files
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  maxAgeMs: 2 * 60 * 60 * 1000, // 2 hours
});

export default claudeFileBridge;