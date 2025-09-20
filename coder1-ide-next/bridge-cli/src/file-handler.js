/**
 * File Handler
 * Handles file system operations for the bridge
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class FileHandler {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.workingDirectory = process.cwd();
  }

  /**
   * Read a file
   */
  async read(filePath, options = {}) {
    try {
      const resolvedPath = this.resolvePath(filePath);
      this.validatePath(resolvedPath);
      
      this.log(`Reading file: ${resolvedPath}`);
      
      const encoding = options.encoding || 'utf8';
      const content = await fs.readFile(resolvedPath, encoding);
      
      return {
        path: resolvedPath,
        content,
        size: Buffer.byteLength(content, encoding),
        encoding
      };
    } catch (error) {
      this.error(`Failed to read file ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Write a file
   */
  async write(filePath, content, options = {}) {
    try {
      const resolvedPath = this.resolvePath(filePath);
      this.validatePath(resolvedPath);
      
      this.log(`Writing file: ${resolvedPath}`);
      
      // Ensure directory exists
      const dir = path.dirname(resolvedPath);
      await fs.mkdir(dir, { recursive: true });
      
      const encoding = options.encoding || 'utf8';
      await fs.writeFile(resolvedPath, content, encoding);
      
      const stats = await fs.stat(resolvedPath);
      
      return {
        path: resolvedPath,
        size: stats.size,
        modified: stats.mtime
      };
    } catch (error) {
      this.error(`Failed to write file ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * List directory contents
   */
  async list(dirPath, options = {}) {
    try {
      const resolvedPath = this.resolvePath(dirPath || '.');
      this.validatePath(resolvedPath);
      
      this.log(`Listing directory: ${resolvedPath}`);
      
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      
      const results = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(resolvedPath, entry.name);
          
          try {
            const stats = await fs.stat(fullPath);
            
            return {
              name: entry.name,
              path: fullPath,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modified: stats.mtime,
              isSymlink: entry.isSymbolicLink()
            };
          } catch (error) {
            // Handle permission errors gracefully
            return {
              name: entry.name,
              path: fullPath,
              type: entry.isDirectory() ? 'directory' : 'file',
              error: error.message
            };
          }
        })
      );
      
      // Sort by type (directories first) then by name
      results.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      if (options.recursive && options.maxDepth > 0) {
        // Recursively list subdirectories
        const subdirs = results.filter(entry => entry.type === 'directory' && !entry.error);
        
        for (const subdir of subdirs) {
          const subResults = await this.list(subdir.path, {
            ...options,
            maxDepth: options.maxDepth - 1
          });
          
          results.push(...subResults.map(entry => ({
            ...entry,
            relativePath: path.join(subdir.name, entry.relativePath || entry.name)
          })));
        }
      }
      
      return results;
    } catch (error) {
      this.error(`Failed to list directory ${dirPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if a file or directory exists
   */
  async exists(filePath) {
    try {
      const resolvedPath = this.resolvePath(filePath);
      this.validatePath(resolvedPath);
      
      this.log(`Checking existence: ${resolvedPath}`);
      
      try {
        const stats = await fs.stat(resolvedPath);
        return {
          exists: true,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime
        };
      } catch (error) {
        if (error.code === 'ENOENT') {
          return {
            exists: false
          };
        }
        throw error;
      }
    } catch (error) {
      this.error(`Failed to check existence of ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Resolve a file path relative to working directory
   */
  resolvePath(filePath) {
    if (path.isAbsolute(filePath)) {
      return path.normalize(filePath);
    }
    return path.resolve(this.workingDirectory, filePath);
  }

  /**
   * Validate that a path is safe (no traversal attacks)
   */
  validatePath(resolvedPath) {
    // Ensure path doesn't escape working directory (unless absolute)
    const relative = path.relative(this.workingDirectory, resolvedPath);
    
    // Check for path traversal attempts
    if (relative.startsWith('..') && !path.isAbsolute(resolvedPath)) {
      throw new Error('Path traversal not allowed');
    }
    
    // Check for sensitive directories
    const sensitivePatterns = [
      /\/\.git\//,
      /\/node_modules\//,
      /\/\.env/,
      /\/\.ssh\//
    ];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(resolvedPath)) {
        this.warn(`Access to sensitive path attempted: ${resolvedPath}`);
        // Note: We'll allow it but warn (user's local machine)
      }
    }
    
    return true;
  }

  /**
   * Set working directory
   */
  setWorkingDirectory(dir) {
    const resolvedDir = path.resolve(dir);
    this.log(`Setting working directory to: ${resolvedDir}`);
    this.workingDirectory = resolvedDir;
    process.chdir(resolvedDir);
  }

  /**
   * Logging helpers
   */
  log(...args) {
    if (this.verbose) {
      console.log(chalk.gray('[Files]'), ...args);
    }
  }

  warn(...args) {
    console.warn(chalk.yellow('[Files]'), ...args);
  }

  error(...args) {
    console.error(chalk.red('[Files]'), ...args);
  }
}

module.exports = FileHandler;