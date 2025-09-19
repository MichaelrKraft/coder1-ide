const chokidar = require('chokidar');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileSync {
  constructor(options) {
    this.logger = options.logger;
    this.config = options.config;
    
    // Project watchers and state
    this.watchers = new Map();
    this.projectStates = new Map();
    this.syncCallbacks = new Map();
    
    // Sync configuration
    this.syncConfig = {
      debounceMs: 100,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      ignoredPatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.cache/**',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/*.log'
      ]
    };
    
    // Debounce timers
    this.debounceTimers = new Map();
  }

  async initProject(projectPath, onChangesCallback) {
    this.logger.info(`📁 Initializing file sync for: ${projectPath}`);
    
    try {
      // Validate project path
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        throw new Error('Project path must be a directory');
      }
      
      // Store callback
      this.syncCallbacks.set(projectPath, onChangesCallback);
      
      // Initialize project state
      const initialState = await this.scanProjectFiles(projectPath);
      this.projectStates.set(projectPath, initialState);
      
      // Setup file watcher
      await this.setupWatcher(projectPath);
      
      this.logger.success(`✅ File sync initialized for ${projectPath} (${initialState.size} files)`);
      
      return {
        success: true,
        fileCount: initialState.size,
        projectPath
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to initialize file sync for ${projectPath}:`, error);
      throw error;
    }
  }

  async scanProjectFiles(projectPath) {
    const fileState = new Map();
    
    const scanDir = async (dirPath) => {
      try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item.name);
          const relativePath = path.relative(projectPath, fullPath);
          
          // Skip ignored patterns
          if (this.shouldIgnore(relativePath)) {
            continue;
          }
          
          if (item.isDirectory()) {
            await scanDir(fullPath);
          } else if (item.isFile()) {
            try {
              const stats = await fs.stat(fullPath);
              
              // Skip large files
              if (stats.size > this.syncConfig.maxFileSize) {
                this.logger.warn(`⚠️  Skipping large file: ${relativePath} (${this.formatFileSize(stats.size)})`);
                continue;
              }
              
              const content = await fs.readFile(fullPath);
              const hash = this.calculateHash(content);
              
              fileState.set(relativePath, {
                path: relativePath,
                fullPath,
                size: stats.size,
                mtime: stats.mtime.getTime(),
                hash,
                type: 'file'
              });
              
            } catch (error) {
              this.logger.debug(`Skipping unreadable file: ${relativePath} - ${error.message}`);
            }
          }
        }
      } catch (error) {
        this.logger.debug(`Skipping directory scan: ${dirPath} - ${error.message}`);
      }
    };
    
    await scanDir(projectPath);
    return fileState;
  }

  async setupWatcher(projectPath) {
    if (this.watchers.has(projectPath)) {
      this.logger.debug(`Watcher already exists for: ${projectPath}`);
      return;
    }
    
    const watcher = chokidar.watch(projectPath, {
      persistent: true,
      ignoreInitial: true,
      ignored: this.syncConfig.ignoredPatterns,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });
    
    // File added
    watcher.on('add', (filePath) => {
      this.handleFileEvent('add', projectPath, filePath);
    });
    
    // File changed
    watcher.on('change', (filePath) => {
      this.handleFileEvent('change', projectPath, filePath);
    });
    
    // File removed
    watcher.on('unlink', (filePath) => {
      this.handleFileEvent('unlink', projectPath, filePath);
    });
    
    // Directory events
    watcher.on('addDir', (dirPath) => {
      this.handleFileEvent('addDir', projectPath, dirPath);
    });
    
    watcher.on('unlinkDir', (dirPath) => {
      this.handleFileEvent('unlinkDir', projectPath, dirPath);
    });
    
    // Error handling
    watcher.on('error', (error) => {
      this.logger.error(`File watcher error for ${projectPath}:`, error);
    });
    
    this.watchers.set(projectPath, watcher);
    this.logger.info(`👁️  File watcher active for: ${projectPath}`);
  }

  async handleFileEvent(eventType, projectPath, filePath) {
    const relativePath = path.relative(projectPath, filePath);
    
    this.logger.debug(`📄 File event: ${eventType} - ${relativePath}`);
    
    // Debounce rapid changes
    const debounceKey = `${projectPath}:${relativePath}`;
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }
    
    this.debounceTimers.set(debounceKey, setTimeout(() => {
      this.processFileEvent(eventType, projectPath, filePath, relativePath);
      this.debounceTimers.delete(debounceKey);
    }, this.syncConfig.debounceMs));
  }

  async processFileEvent(eventType, projectPath, filePath, relativePath) {
    try {
      const projectState = this.projectStates.get(projectPath);
      if (!projectState) return;
      
      const changes = [];
      
      switch (eventType) {
        case 'add':
        case 'change':
          const newFileInfo = await this.getFileInfo(filePath, relativePath);
          if (newFileInfo) {
            const oldFileInfo = projectState.get(relativePath);
            
            if (!oldFileInfo || oldFileInfo.hash !== newFileInfo.hash) {
              projectState.set(relativePath, newFileInfo);
              
              changes.push({
                type: oldFileInfo ? 'modified' : 'added',
                path: relativePath,
                size: newFileInfo.size,
                mtime: newFileInfo.mtime
              });
            }
          }
          break;
          
        case 'unlink':
          if (projectState.has(relativePath)) {
            projectState.delete(relativePath);
            changes.push({
              type: 'deleted',
              path: relativePath
            });
          }
          break;
          
        case 'addDir':
          changes.push({
            type: 'dir_added',
            path: relativePath
          });
          break;
          
        case 'unlinkDir':
          // Remove all files in the directory from state
          const toDelete = [];
          for (const [filePath, fileInfo] of projectState) {
            if (filePath.startsWith(relativePath + path.sep)) {
              toDelete.push(filePath);
            }
          }
          
          for (const filePath of toDelete) {
            projectState.delete(filePath);
            changes.push({
              type: 'deleted',
              path: filePath
            });
          }
          
          changes.push({
            type: 'dir_deleted',
            path: relativePath
          });
          break;
      }
      
      // Notify callback if there are changes
      if (changes.length > 0) {
        const callback = this.syncCallbacks.get(projectPath);
        if (callback) {
          callback({
            projectPath,
            timestamp: new Date().toISOString(),
            changes
          });
        }
      }
      
    } catch (error) {
      this.logger.error(`Error processing file event ${eventType} for ${relativePath}:`, error);
    }
  }

  async getFileInfo(filePath, relativePath) {
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) return null;
      
      // Skip large files
      if (stats.size > this.syncConfig.maxFileSize) {
        return null;
      }
      
      const content = await fs.readFile(filePath);
      const hash = this.calculateHash(content);
      
      return {
        path: relativePath,
        fullPath: filePath,
        size: stats.size,
        mtime: stats.mtime.getTime(),
        hash,
        type: 'file'
      };
      
    } catch (error) {
      this.logger.debug(`Failed to get file info for ${relativePath}:`, error.message);
      return null;
    }
  }

  async syncFiles(projectPath, files) {
    this.logger.info(`🔄 Syncing ${files.length} files for: ${projectPath}`);
    
    try {
      const results = [];
      
      for (const fileData of files) {
        const result = await this.syncSingleFile(projectPath, fileData);
        results.push(result);
      }
      
      this.logger.success(`✅ File sync completed: ${results.filter(r => r.success).length}/${results.length} files`);
      
      return {
        success: true,
        results,
        projectPath
      };
      
    } catch (error) {
      this.logger.error(`❌ File sync failed for ${projectPath}:`, error);
      throw error;
    }
  }

  async syncSingleFile(projectPath, fileData) {
    const { path: relativePath, content, action } = fileData;
    const fullPath = path.join(projectPath, relativePath);
    
    try {
      switch (action) {
        case 'write':
          await this.ensureDirectory(path.dirname(fullPath));
          await fs.writeFile(fullPath, content, 'utf8');
          
          this.logger.debug(`📝 File written: ${relativePath}`);
          return { path: relativePath, action: 'write', success: true };
          
        case 'delete':
          try {
            await fs.unlink(fullPath);
            this.logger.debug(`🗑️  File deleted: ${relativePath}`);
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
          }
          return { path: relativePath, action: 'delete', success: true };
          
        case 'read':
          const fileContent = await fs.readFile(fullPath, 'utf8');
          return { path: relativePath, action: 'read', success: true, content: fileContent };
          
        default:
          throw new Error(`Unknown sync action: ${action}`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Failed to sync file ${relativePath}:`, error.message);
      return { path: relativePath, action, success: false, error: error.message };
    }
  }

  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  shouldIgnore(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    return this.syncConfig.ignoredPatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(normalizedPath);
    });
  }

  calculateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getProjectState(projectPath) {
    return this.projectStates.get(projectPath) || new Map();
  }

  async getProjectFiles(projectPath) {
    const state = this.projectStates.get(projectPath);
    if (!state) return [];
    
    return Array.from(state.values());
  }

  cleanupProject(projectPath) {
    this.logger.info(`🧹 Cleaning up file sync for: ${projectPath}`);
    
    // Stop watcher
    const watcher = this.watchers.get(projectPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(projectPath);
    }
    
    // Clean up state
    this.projectStates.delete(projectPath);
    this.syncCallbacks.delete(projectPath);
    
    // Clear debounce timers
    for (const [key, timer] of this.debounceTimers) {
      if (key.startsWith(`${projectPath}:`)) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    }
  }

  isReady() {
    return true; // FileSync is always ready
  }

  async cleanup() {
    this.logger.info('🧹 Cleaning up File Sync service...');
    
    // Close all watchers
    for (const [projectPath, watcher] of this.watchers) {
      watcher.close();
    }
    
    // Clear all state
    this.watchers.clear();
    this.projectStates.clear();
    this.syncCallbacks.clear();
    
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    this.logger.info('✅ File Sync cleanup complete');
  }
}

module.exports = { FileSync };