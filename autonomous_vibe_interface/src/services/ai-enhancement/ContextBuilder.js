/**
 * Context Builder - Passive Project Intelligence
 * 
 * Watches filesystem changes and builds contextual understanding
 * for AI agents without requiring user intervention.
 * 
 * Core Philosophy: Simplicity = Magic
 * - Watch files passively
 * - Build context incrementally  
 * - Make agents contextually aware
 * - Zero user effort required
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class ContextBuilder extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.rootPath = options.rootPath || process.cwd();
        this.watchPaths = options.watchPaths || ['src', 'coder1-ide', 'public'];
        this.ignorePatterns = options.ignorePatterns || [
            'node_modules',
            '.git',
            'build',
            'dist',
            '.swp',
            '.tmp'
        ];
        
        // Project context state
        this.projectContext = {
            structure: new Map(),
            fileTypes: new Map(),
            recentChanges: [],
            patterns: {
                architecture: 'unknown',
                framework: 'unknown',
                testingApproach: 'unknown',
                buildSystem: 'unknown'
            },
            lastAnalysis: null
        };
        
        this.watchers = [];
        this.analysisTimeout = null;
    }

    /**
     * Initialize context building
     */
    async initialize() {
        console.log('🔍 Context Builder: Starting passive project analysis...');
        
        // Initial project scan
        await this.scanProject();
        
        // Start watching for changes
        this.startWatching();
        
        // Analyze patterns
        this.analyzeProject();
        
        console.log('✅ Context Builder: Active and watching for changes');
        
        this.emit('initialized', {
            filesScanned: this.projectContext.structure.size,
            patterns: this.projectContext.patterns
        });
    }

    /**
     * Scan project structure initially
     */
    async scanProject() {
        for (const watchPath of this.watchPaths) {
            const fullPath = path.join(this.rootPath, watchPath);
            
            if (fs.existsSync(fullPath)) {
                await this.scanDirectory(fullPath, watchPath);
            }
        }
    }

    /**
     * Recursively scan directory
     */
    async scanDirectory(dirPath, relativePath) {
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                if (this.shouldIgnore(item)) continue;
                
                const fullPath = path.join(dirPath, item);
                const relativeItemPath = path.join(relativePath, item);
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory()) {
                    await this.scanDirectory(fullPath, relativeItemPath);
                } else if (stats.isFile()) {
                    await this.analyzeFile(fullPath, relativeItemPath);
                }
            }
        } catch (error) {
            // Silently handle permission errors
            console.warn(`Context Builder: Cannot access ${dirPath}`);
        }
    }

    /**
     * Analyze individual file
     */
    async analyzeFile(fullPath, relativePath) {
        try {
            const stats = fs.statSync(fullPath);
            const ext = path.extname(fullPath).toLowerCase();
            
            // Basic file info
            const fileInfo = {
                path: relativePath,
                fullPath,
                extension: ext,
                size: stats.size,
                modified: stats.mtime,
                type: this.getFileType(ext)
            };
            
            // Light content analysis for key files
            if (this.isKeyFile(relativePath)) {
                fileInfo.summary = await this.analyzeFileContent(fullPath, ext);
            }
            
            this.projectContext.structure.set(relativePath, fileInfo);
            
            // Update file type counts
            const currentCount = this.projectContext.fileTypes.get(ext) || 0;
            this.projectContext.fileTypes.set(ext, currentCount + 1);
            
        } catch (error) {
            // Silently handle file access errors
            console.warn(`Context Builder: Cannot analyze ${relativePath}`);
        }
    }

    /**
     * Analyze file content for context
     */
    async analyzeFileContent(fullPath, ext) {
        try {
            // Only analyze text files under 100KB
            const stats = fs.statSync(fullPath);
            if (stats.size > 100000) return 'large-file';
            
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            
            // Extract key patterns based on file type
            const summary = {
                lines: lines.length,
                imports: [],
                exports: [],
                functions: [],
                components: [],
                patterns: []
            };
            
            // JavaScript/TypeScript analysis
            if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
                summary.imports = this.extractImports(content);
                summary.exports = this.extractExports(content);
                summary.functions = this.extractFunctions(content);
                summary.components = this.extractComponents(content);
            }
            
            // JSON analysis
            if (ext === '.json') {
                try {
                    const json = JSON.parse(content);
                    if (json.dependencies) summary.patterns.push('package-dependencies');
                    if (json.scripts) summary.patterns.push('npm-scripts');
                    if (json.devDependencies) summary.patterns.push('dev-dependencies');
                } catch (e) {
                    // Invalid JSON, skip
                }
            }
            
            return summary;
        } catch (error) {
            return 'analysis-error';
        }
    }

    /**
     * Start watching for file changes
     */
    startWatching() {
        for (const watchPath of this.watchPaths) {
            const fullPath = path.join(this.rootPath, watchPath);
            
            if (fs.existsSync(fullPath)) {
                try {
                    const watcher = fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
                        if (filename && !this.shouldIgnore(filename)) {
                            this.handleFileChange(eventType, path.join(watchPath, filename));
                        }
                    });
                    
                    this.watchers.push(watcher);
                    console.log(`👁️ Watching: ${watchPath}`);
                } catch (error) {
                    console.warn(`Context Builder: Cannot watch ${watchPath}`);
                }
            }
        }
    }

    /**
     * Handle file change events
     */
    handleFileChange(eventType, relativePath) {
        const fullPath = path.join(this.rootPath, relativePath);
        
        // Debounce analysis
        if (this.analysisTimeout) {
            clearTimeout(this.analysisTimeout);
        }
        
        this.analysisTimeout = setTimeout(async () => {
            if (eventType === 'rename') {
                // File added or removed
                if (fs.existsSync(fullPath)) {
                    await this.analyzeFile(fullPath, relativePath);
                    this.addRecentChange('added', relativePath);
                } else {
                    this.projectContext.structure.delete(relativePath);
                    this.addRecentChange('removed', relativePath);
                }
            } else if (eventType === 'change') {
                // File modified
                if (fs.existsSync(fullPath)) {
                    await this.analyzeFile(fullPath, relativePath);
                    this.addRecentChange('modified', relativePath);
                }
            }
            
            // Re-analyze project patterns
            this.analyzeProject();
            
            // Notify agents of context change
            this.emit('contextUpdated', {
                eventType,
                path: relativePath,
                context: this.getProjectContext()
            });
            
        }, 500); // 500ms debounce
    }

    /**
     * Add to recent changes
     */
    addRecentChange(action, path) {
        this.projectContext.recentChanges.unshift({
            action,
            path,
            timestamp: Date.now()
        });
        
        // Keep only last 50 changes
        if (this.projectContext.recentChanges.length > 50) {
            this.projectContext.recentChanges = this.projectContext.recentChanges.slice(0, 50);
        }
    }

    /**
     * Analyze project patterns
     */
    analyzeProject() {
        const patterns = {
            architecture: this.detectArchitecture(),
            framework: this.detectFramework(),
            testingApproach: this.detectTestingApproach(),
            buildSystem: this.detectBuildSystem(),
            codeStyle: this.detectCodeStyle()
        };
        
        this.projectContext.patterns = patterns;
        this.projectContext.lastAnalysis = Date.now();
        
        console.log('🧠 Project patterns updated:', patterns);
    }

    /**
     * Detect project architecture
     */
    detectArchitecture() {
        const files = Array.from(this.projectContext.structure.keys());
        
        if (files.some(f => f.includes('microservice') || f.includes('service'))) {
            return 'microservices';
        }
        if (files.some(f => f.includes('component') && f.includes('src'))) {
            return 'component-based';
        }
        if (files.some(f => f.includes('routes') && f.includes('models'))) {
            return 'mvc';
        }
        return 'monolithic';
    }

    /**
     * Detect framework
     */
    detectFramework() {
        const files = Array.from(this.projectContext.structure.keys());
        
        if (files.some(f => f.includes('package.json'))) {
            const packageFile = this.projectContext.structure.get('package.json');
            if (packageFile && packageFile.summary && packageFile.summary.patterns) {
                if (packageFile.summary.patterns.includes('package-dependencies')) {
                    // Would need to check actual dependencies
                    return 'react-express'; // Based on your codebase
                }
            }
        }
        
        if (files.some(f => f.endsWith('.tsx') || f.endsWith('.jsx'))) {
            return 'react';
        }
        if (files.some(f => f.includes('express') || f.includes('router'))) {
            return 'express';
        }
        
        return 'mixed';
    }

    /**
     * Detect testing approach
     */
    detectTestingApproach() {
        const files = Array.from(this.projectContext.structure.keys());
        
        if (files.some(f => f.includes('test') || f.includes('spec'))) {
            if (files.some(f => f.includes('jest'))) return 'jest';
            if (files.some(f => f.includes('mocha'))) return 'mocha';
            return 'present';
        }
        return 'minimal';
    }

    /**
     * Detect build system
     */
    detectBuildSystem() {
        const files = Array.from(this.projectContext.structure.keys());
        
        if (files.some(f => f.includes('webpack'))) return 'webpack';
        if (files.some(f => f.includes('vite'))) return 'vite';
        if (files.some(f => f.includes('package.json'))) return 'npm';
        return 'unknown';
    }

    /**
     * Detect code style patterns
     */
    detectCodeStyle() {
        const jsFiles = Array.from(this.projectContext.structure.values())
            .filter(f => ['.js', '.jsx', '.ts', '.tsx'].includes(f.extension));
        
        if (jsFiles.length === 0) return 'unknown';
        
        // This is simplified - in real implementation would analyze actual code
        return {
            language: jsFiles.some(f => f.extension.includes('ts')) ? 'typescript' : 'javascript',
            framework: 'react-express',
            style: 'modern'
        };
    }

    /**
     * Get current project context for agents
     */
    getProjectContext() {
        return {
            summary: {
                totalFiles: this.projectContext.structure.size,
                fileTypes: Object.fromEntries(this.projectContext.fileTypes),
                architecture: this.projectContext.patterns.architecture,
                framework: this.projectContext.patterns.framework,
                lastUpdated: this.projectContext.lastAnalysis
            },
            recentChanges: this.projectContext.recentChanges.slice(0, 10),
            patterns: this.projectContext.patterns,
            keyFiles: this.getKeyFiles()
        };
    }

    /**
     * Get key project files
     */
    getKeyFiles() {
        const keyFiles = [];
        
        for (const [path, info] of this.projectContext.structure) {
            if (this.isKeyFile(path)) {
                keyFiles.push({
                    path,
                    type: info.type,
                    summary: info.summary
                });
            }
        }
        
        return keyFiles.slice(0, 20); // Top 20 key files
    }

    /**
     * Helper methods
     */
    shouldIgnore(filename) {
        return this.ignorePatterns.some(pattern => filename.includes(pattern));
    }

    isKeyFile(path) {
        const keyPatterns = [
            'package.json',
            'README.md',
            'app.js',
            'index.js',
            'index.tsx',
            '.env',
            'config',
            'routes',
            'components'
        ];
        
        return keyPatterns.some(pattern => path.includes(pattern));
    }

    getFileType(ext) {
        const typeMap = {
            '.js': 'javascript',
            '.jsx': 'react',
            '.ts': 'typescript', 
            '.tsx': 'react-typescript',
            '.json': 'config',
            '.md': 'documentation',
            '.css': 'styles',
            '.html': 'markup',
            '.py': 'python'
        };
        
        return typeMap[ext] || 'other';
    }

    // Content extraction helpers (simplified)
    extractImports(content) {
        const imports = [];
        const importRegex = /import.*from\s+['"`]([^'"`]+)['"`]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
        return imports.slice(0, 10); // Top 10 imports
    }

    extractExports(content) {
        const exports = [];
        const exportRegex = /export\s+(default\s+)?(class|function|const|let|var)\s+(\w+)/g;
        let match;
        while ((match = exportRegex.exec(content)) !== null) {
            exports.push(match[3]);
        }
        return exports.slice(0, 10);
    }

    extractFunctions(content) {
        const functions = [];
        const funcRegex = /(function\s+(\w+)|const\s+(\w+)\s*=\s*[^=])/g;
        let match;
        while ((match = funcRegex.exec(content)) !== null) {
            functions.push(match[2] || match[3]);
        }
        return functions.slice(0, 10);
    }

    extractComponents(content) {
        const components = [];
        const compRegex = /(class\s+(\w+)\s+extends\s+Component|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>)/g;
        let match;
        while ((match = compRegex.exec(content)) !== null) {
            components.push(match[2] || match[3]);
        }
        return components.slice(0, 10);
    }

    /**
     * Cleanup watchers
     */
    destroy() {
        this.watchers.forEach(watcher => {
            try {
                watcher.close();
            } catch (error) {
                // Ignore cleanup errors
            }
        });
        
        if (this.analysisTimeout) {
            clearTimeout(this.analysisTimeout);
        }
        
        console.log('🔍 Context Builder: Stopped watching');
    }
}

module.exports = { ContextBuilder };