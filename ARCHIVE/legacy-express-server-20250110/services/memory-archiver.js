/**
 * Memory Archiver Service
 * Implements auto-archiving with size thresholds (Claude Conductor inspired)
 * Keeps active memory lean while preserving historical data
 */

const fs = require('fs').promises;
const path = require('path');

class MemoryArchiverService {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || process.cwd();
        this.memoryDir = path.join(this.projectRoot, '.coder1', 'memory');
        this.archiveDir = path.join(this.projectRoot, '.coder1', 'archive');
        this.logger = options.logger || console;
        
        // Configuration
        this.config = {
            maxLines: options.maxLines || 500,           // Default 500 lines per file
            maxEntries: options.maxEntries || 100,       // Max entries per file
            maxSizeMB: options.maxSizeMB || 5,          // Max file size in MB
            keepRecentEntries: options.keepRecentEntries || 20,  // Keep recent entries
            archivePattern: options.archivePattern || '{filename}_{timestamp}',
            ...options.config
        };
        
        // Files to monitor
        this.monitoredFiles = [
            'agent-insights.json',
            'task-outcomes.json',
            'code-patterns.json',
            'vibe-metrics.json'
        ];
    }

    /**
     * Initialize archiver and ensure directories exist
     */
    async initialize() {
        try {
            await fs.mkdir(this.archiveDir, { recursive: true });
            this.logger.info('✅ Memory Archiver initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Memory Archiver:', error);
            throw error;
        }
    }

    /**
     * Check all monitored files and archive if needed
     */
    async checkAndArchiveAll() {
        const results = [];
        
        for (const filename of this.monitoredFiles) {
            try {
                const result = await this.checkFile(filename);
                if (result.shouldArchive) {
                    const archiveResult = await this.archiveFile(filename);
                    results.push({ filename, archived: true, ...archiveResult });
                } else {
                    results.push({ filename, archived: false, reason: result.reason });
                }
            } catch (error) {
                results.push({ filename, archived: false, error: error.message });
            }
        }
        
        return results;
    }

    /**
     * Check if a specific file needs archiving
     */
    async checkFile(filename) {
        const filePath = path.join(this.memoryDir, filename);
        
        try {
            const stats = await this.getFileStats(filePath);
            
            // Check thresholds
            if (stats.lines > this.config.maxLines) {
                return { shouldArchive: true, reason: `Exceeds max lines (${stats.lines} > ${this.config.maxLines})` };
            }
            
            if (stats.entries > this.config.maxEntries) {
                return { shouldArchive: true, reason: `Exceeds max entries (${stats.entries} > ${this.config.maxEntries})` };
            }
            
            if (stats.sizeMB > this.config.maxSizeMB) {
                return { shouldArchive: true, reason: `Exceeds max size (${stats.sizeMB}MB > ${this.config.maxSizeMB}MB)` };
            }
            
            return { shouldArchive: false, reason: 'Within limits', stats };
        } catch (error) {
            if (error.code === 'ENOENT') {
                return { shouldArchive: false, reason: 'File does not exist' };
            }
            throw error;
        }
    }

    /**
     * Get file statistics
     */
    async getFileStats(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        const size = Buffer.byteLength(content, 'utf-8');
        const lines = content.split('\n').length;
        
        let entries = 0;
        try {
            const data = JSON.parse(content);
            entries = Array.isArray(data) ? data.length : Object.keys(data).length;
        } catch {
            // Not JSON, estimate entries by lines
            entries = Math.max(1, lines / 10);
        }
        
        return {
            size,
            sizeMB: parseFloat((size / (1024 * 1024)).toFixed(2)),
            lines,
            entries,
            modified: (await fs.stat(filePath)).mtime
        };
    }

    /**
     * Archive a file while keeping recent entries
     */
    async archiveFile(filename) {
        const sourcePath = path.join(this.memoryDir, filename);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseFilename = filename.replace('.json', '');
        const archiveFilename = this.config.archivePattern
            .replace('{filename}', baseFilename)
            .replace('{timestamp}', timestamp) + '.json';
        const archivePath = path.join(this.archiveDir, archiveFilename);
        
        try {
            // Load current data
            const content = await fs.readFile(sourcePath, 'utf-8');
            const data = JSON.parse(content);
            
            if (!Array.isArray(data)) {
                throw new Error(`Cannot archive non-array data in ${filename}`);
            }
            
            // Sort by timestamp (newest first) 
            const sortedData = data.sort((a, b) => {
                const aTime = a.createdAt || a.lastUsed || a.timestamp || 0;
                const bTime = b.createdAt || b.lastUsed || b.timestamp || 0;
                return bTime - aTime;
            });
            
            // Split data: keep recent, archive old
            const recentEntries = sortedData.slice(0, this.config.keepRecentEntries);
            const archiveEntries = sortedData.slice(this.config.keepRecentEntries);
            
            // Save archive
            const archiveData = {
                archivedAt: new Date().toISOString(),
                originalFile: filename,
                totalEntries: archiveEntries.length,
                dateRange: this.getDateRange(archiveEntries),
                entries: archiveEntries
            };
            
            await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2), 'utf-8');
            
            // Update original file with recent entries only
            await fs.writeFile(sourcePath, JSON.stringify(recentEntries, null, 2), 'utf-8');
            
            this.logger.info(`📦 Archived ${archiveEntries.length} entries from ${filename} to ${archiveFilename}`);
            
            return {
                archiveFile: archiveFilename,
                archivedEntries: archiveEntries.length,
                remainingEntries: recentEntries.length,
                archivePath
            };
        } catch (error) {
            this.logger.error(`Failed to archive ${filename}:`, error);
            throw error;
        }
    }

    /**
     * Get date range for archived entries
     */
    getDateRange(entries) {
        if (entries.length === 0) return null;
        
        const dates = entries.map(entry => {
            const timestamp = entry.createdAt || entry.lastUsed || entry.timestamp;
            return timestamp ? new Date(timestamp) : new Date(0);
        }).filter(date => date.getTime() > 0);
        
        if (dates.length === 0) return null;
        
        const earliest = new Date(Math.min(...dates));
        const latest = new Date(Math.max(...dates));
        
        return {
            from: earliest.toISOString(),
            to: latest.toISOString(),
            span: this.formatDateSpan(earliest, latest)
        };
    }

    /**
     * Format date span for display
     */
    formatDateSpan(start, end) {
        const diffMs = end - start;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Same day';
        if (diffDays === 1) return '1 day';
        if (diffDays < 30) return `${diffDays} days`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
        return `${Math.floor(diffDays / 365)} years`;
    }

    /**
     * List all archive files
     */
    async listArchives() {
        try {
            const files = await fs.readdir(this.archiveDir);
            const archives = [];
            
            for (const filename of files.filter(f => f.endsWith('.json'))) {
                const archivePath = path.join(this.archiveDir, filename);
                const stats = await fs.stat(archivePath);
                
                try {
                    const content = await fs.readFile(archivePath, 'utf-8');
                    const data = JSON.parse(content);
                    
                    archives.push({
                        filename,
                        path: archivePath,
                        originalFile: data.originalFile,
                        archivedAt: data.archivedAt,
                        totalEntries: data.totalEntries,
                        dateRange: data.dateRange,
                        size: stats.size,
                        sizeMB: parseFloat((stats.size / (1024 * 1024)).toFixed(2))
                    });
                } catch (error) {
                    // Skip malformed archive files
                    this.logger.warn(`Skipping malformed archive: ${filename}`);
                }
            }
            
            return archives.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
        } catch (error) {
            this.logger.error('Failed to list archives:', error);
            return [];
        }
    }

    /**
     * Restore entries from archive to active memory
     */
    async restoreFromArchive(archiveFilename, entryCount = null) {
        const archivePath = path.join(this.archiveDir, archiveFilename);
        
        try {
            const content = await fs.readFile(archivePath, 'utf-8');
            const archiveData = JSON.parse(content);
            
            const originalPath = path.join(this.memoryDir, archiveData.originalFile);
            let currentData = [];
            
            // Load current data if exists
            try {
                const currentContent = await fs.readFile(originalPath, 'utf-8');
                currentData = JSON.parse(currentContent);
            } catch (error) {
                // File doesn't exist, start with empty array
                currentData = [];
            }
            
            // Get entries to restore (newest first)
            const entriesToRestore = entryCount 
                ? archiveData.entries.slice(0, entryCount)
                : archiveData.entries;
            
            // Merge with current data (avoiding duplicates by ID if available)
            const mergedData = [...currentData];
            
            entriesToRestore.forEach(entry => {
                // Simple duplicate check by ID or timestamp
                const isDuplicate = mergedData.some(existing => 
                    (entry.id && existing.id === entry.id) ||
                    (entry.timestamp && existing.timestamp === entry.timestamp)
                );
                
                if (!isDuplicate) {
                    mergedData.push(entry);
                }
            });
            
            // Save merged data
            await fs.writeFile(originalPath, JSON.stringify(mergedData, null, 2), 'utf-8');
            
            this.logger.info(`📤 Restored ${entriesToRestore.length} entries from ${archiveFilename}`);
            
            return {
                restoredEntries: entriesToRestore.length,
                totalEntries: mergedData.length,
                targetFile: archiveData.originalFile
            };
        } catch (error) {
            this.logger.error(`Failed to restore from ${archiveFilename}:`, error);
            throw error;
        }
    }

    /**
     * Get summary statistics
     */
    async getArchiveStats() {
        const archives = await this.listArchives();
        const totalEntries = archives.reduce((sum, archive) => sum + archive.totalEntries, 0);
        const totalSize = archives.reduce((sum, archive) => sum + archive.sizeMB, 0);
        
        // Group by original file
        const byFile = {};
        archives.forEach(archive => {
            if (!byFile[archive.originalFile]) {
                byFile[archive.originalFile] = { count: 0, entries: 0, sizeMB: 0 };
            }
            byFile[archive.originalFile].count++;
            byFile[archive.originalFile].entries += archive.totalEntries;
            byFile[archive.originalFile].sizeMB += archive.sizeMB;
        });
        
        return {
            totalArchives: archives.length,
            totalEntries,
            totalSizeMB: parseFloat(totalSize.toFixed(2)),
            byFile,
            oldestArchive: archives.length > 0 ? archives[archives.length - 1].archivedAt : null,
            newestArchive: archives.length > 0 ? archives[0].archivedAt : null
        };
    }
}

module.exports = MemoryArchiverService;