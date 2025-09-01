const fs = require('fs').promises;
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const glob = require('glob');
const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * Codebase Wiki Service
 * Creates searchable, AI-powered knowledge graph of codebase
 */
class CodebaseWiki extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.projectRoot = options.projectRoot || process.cwd();
        this.indexDir = path.join(this.projectRoot, '.coder1', 'codebase-index');
        this.excludePatterns = options.excludePatterns || [
            'node_modules/**',
            'build/**',
            'dist/**',
            '*.min.js',
            '.git/**',
            'coverage/**'
        ];
        
        // Parser configuration
        this.parserOptions = {
            sourceType: 'module',
            allowImportExportEverywhere: true,
            allowReturnOutsideFunction: true,
            plugins: [
                'jsx',
                'typescript',
                'decorators-legacy',
                'classProperties',
                'asyncGenerators',
                'functionBind',
                'exportDefaultFrom',
                'exportNamespaceFrom',
                'dynamicImport',
                'nullishCoalescingOperator',
                'optionalChaining'
            ]
        };
        
        // Index structure
        this.index = {
            files: new Map(),
            functions: new Map(),
            classes: new Map(),
            variables: new Map(),
            imports: new Map(),
            dependencies: new Map(),
            lastIndexed: null
        };
        
        this.logger = options.logger || console;
        this.isIndexing = false;
        
        this.initializeIndex();
    }
    
    async initializeIndex() {
        try {
            await fs.mkdir(this.indexDir, { recursive: true });
            await this.loadExistingIndex();
            this.logger.log('📚 [CODEBASE-WIKI] Initialized');
        } catch (error) {
            this.logger.error('❌ [CODEBASE-WIKI] Init failed:', error);
        }
    }
    
    /**
     * Full codebase indexing
     */
    async indexCodebase() {
        if (this.isIndexing) {
            this.logger.warn('⚠️ [CODEBASE-WIKI] Indexing already in progress');
            return;
        }
        
        this.isIndexing = true;
        this.emit('indexing-start');
        
        try {
            this.logger.log('🔍 [CODEBASE-WIKI] Starting codebase indexing...');
            
            // Find all relevant files
            const files = await this.findCodeFiles();
            this.logger.log(`📄 [CODEBASE-WIKI] Found ${files.length} files to index`);
            
            // Clear existing index
            this.clearIndex();
            
            // Process files
            let processed = 0;
            for (const filePath of files) {
                try {
                    await this.indexFile(filePath);
                    processed++;
                    
                    if (processed % 10 === 0) {
                        this.emit('indexing-progress', { processed, total: files.length });
                        this.logger.log(`📊 [CODEBASE-WIKI] Progress: ${processed}/${files.length} files`);
                    }
                } catch (error) {
                    this.logger.warn(`⚠️ [CODEBASE-WIKI] Failed to index ${filePath}:`, error.message);
                }
            }
            
            // Build cross-references
            await this.buildCrossReferences();
            
            // Save index to disk
            await this.saveIndex();
            
            this.index.lastIndexed = new Date().toISOString();
            
            this.logger.log(`✅ [CODEBASE-WIKI] Indexing complete: ${processed} files, ${this.index.functions.size} functions, ${this.index.classes.size} classes`);
            this.emit('indexing-complete', {
                filesProcessed: processed,
                functionsFound: this.index.functions.size,
                classesFound: this.index.classes.size
            });
            
        } catch (error) {
            this.logger.error('❌ [CODEBASE-WIKI] Indexing failed:', error);
            this.emit('indexing-error', error);
        } finally {
            this.isIndexing = false;
        }
    }
    
    /**
     * Find all code files to index
     */
    async findCodeFiles() {
        const patterns = [
            '**/*.js',
            '**/*.jsx',
            '**/*.ts',
            '**/*.tsx',
            '**/*.mjs'
        ];
        
        const files = [];
        
        for (const pattern of patterns) {
            const matches = glob.sync(pattern, {
                cwd: this.projectRoot,
                ignore: this.excludePatterns,
                absolute: true
            });
            files.push(...matches);
        }
        
        // Remove duplicates and sort
        return [...new Set(files)].sort();
    }
    
    /**
     * Index a single file
     */
    async indexFile(filePath) {
        const relativePath = path.relative(this.projectRoot, filePath);
        const content = await fs.readFile(filePath, 'utf8');
        const hash = crypto.createHash('md5').update(content).digest('hex');
        
        // Check if file has changed
        const existingFile = this.index.files.get(relativePath);
        if (existingFile && existingFile.hash === hash) {
            return; // File unchanged, skip parsing
        }
        
        try {
            // Parse AST
            const ast = parse(content, this.parserOptions);
            
            const fileInfo = {
                path: relativePath,
                absolutePath: filePath,
                hash,
                size: content.length,
                lines: content.split('\n').length,
                functions: [],
                classes: [],
                variables: [],
                imports: [],
                exports: [],
                lastModified: (await fs.stat(filePath)).mtime.toISOString(),
                indexedAt: new Date().toISOString()
            };
            
            // Traverse AST and extract information
            traverse(ast, {
                FunctionDeclaration: (astPath) => {
                    const func = this.extractFunction(astPath, fileInfo, content);
                    if (func) {
                        fileInfo.functions.push(func.id);
                        this.index.functions.set(func.id, func);
                    }
                },
                
                FunctionExpression: (astPath) => {
                    const func = this.extractFunction(astPath, fileInfo, content);
                    if (func) {
                        fileInfo.functions.push(func.id);
                        this.index.functions.set(func.id, func);
                    }
                },
                
                ArrowFunctionExpression: (astPath) => {
                    if (astPath.parent.type === 'VariableDeclarator' && astPath.parent.id.name) {
                        const func = this.extractFunction(astPath, fileInfo, content);
                        if (func) {
                            fileInfo.functions.push(func.id);
                            this.index.functions.set(func.id, func);
                        }
                    }
                },
                
                ClassDeclaration: (astPath) => {
                    const cls = this.extractClass(astPath, fileInfo, content);
                    if (cls) {
                        fileInfo.classes.push(cls.id);
                        this.index.classes.set(cls.id, cls);
                    }
                },
                
                VariableDeclarator: (astPath) => {
                    const variable = this.extractVariable(astPath, fileInfo);
                    if (variable) {
                        fileInfo.variables.push(variable.id);
                        this.index.variables.set(variable.id, variable);
                    }
                },
                
                ImportDeclaration: (astPath) => {
                    const importInfo = this.extractImport(astPath, fileInfo);
                    if (importInfo) {
                        fileInfo.imports.push(importInfo);
                    }
                },
                
                ExportNamedDeclaration: (astPath) => {
                    const exportInfo = this.extractExport(astPath, fileInfo);
                    if (exportInfo) {
                        fileInfo.exports.push(exportInfo);
                    }
                },
                
                ExportDefaultDeclaration: (astPath) => {
                    const exportInfo = this.extractExport(astPath, fileInfo);
                    if (exportInfo) {
                        fileInfo.exports.push(exportInfo);
                    }
                }
            });
            
            this.index.files.set(relativePath, fileInfo);
            
        } catch (error) {
            // If parsing fails, still store basic file info
            this.logger.warn(`⚠️ [CODEBASE-WIKI] Parse error in ${relativePath}: ${error.message}`);
            
            const fileInfo = {
                path: relativePath,
                absolutePath: filePath,
                hash,
                size: content.length,
                lines: content.split('\n').length,
                functions: [],
                classes: [],
                variables: [],
                imports: [],
                exports: [],
                parseError: error.message,
                lastModified: (await fs.stat(filePath)).mtime.toISOString(),
                indexedAt: new Date().toISOString()
            };
            
            this.index.files.set(relativePath, fileInfo);
        }
    }
    
    /**
     * Extract function information from AST
     */
    extractFunction(astPath, fileInfo, content) {
        const node = astPath.node;
        let name = null;
        
        if (node.type === 'FunctionDeclaration') {
            name = node.id?.name;
        } else if (astPath.parent.type === 'VariableDeclarator') {
            name = astPath.parent.id.name;
        } else if (astPath.parent.type === 'Property') {
            name = astPath.parent.key.name || astPath.parent.key.value;
        }
        
        if (!name) return null;
        
        const id = `${fileInfo.path}:${name}`;
        
        // Extract source code
        const start = node.start;
        const end = node.end;
        const sourceCode = content.substring(start, end);
        
        return {
            id,
            name,
            type: 'function',
            file: fileInfo.path,
            line: this.getLineNumber(content, start),
            params: node.params.map(param => {
                if (param.type === 'Identifier') {
                    return { name: param.name, type: 'any' };
                }
                return { name: 'unknown', type: 'any' };
            }),
            async: node.async || false,
            generator: node.generator || false,
            sourceCode: sourceCode.split('\n').slice(0, 10).join('\n') + (sourceCode.split('\n').length > 10 ? '\n...' : ''),
            complexity: this.calculateComplexity(astPath),
            usages: [] // Will be populated in buildCrossReferences
        };
    }
    
    /**
     * Extract class information from AST
     */
    extractClass(astPath, fileInfo, content) {
        const node = astPath.node;
        const name = node.id?.name;
        
        if (!name) return null;
        
        const id = `${fileInfo.path}:${name}`;
        
        // Extract methods
        const methods = [];
        if (node.body && node.body.body) {
            for (const method of node.body.body) {
                if (method.type === 'MethodDefinition' && method.key.name) {
                    methods.push({
                        name: method.key.name,
                        type: method.kind, // 'method', 'constructor', 'get', 'set'
                        static: method.static || false,
                        async: method.value.async || false
                    });
                }
            }
        }
        
        return {
            id,
            name,
            type: 'class',
            file: fileInfo.path,
            line: this.getLineNumber(content, node.start),
            superClass: node.superClass?.name || null,
            methods,
            usages: [] // Will be populated in buildCrossReferences
        };
    }
    
    /**
     * Extract variable information from AST
     */
    extractVariable(astPath, fileInfo) {
        const node = astPath.node;
        const name = node.id?.name;
        
        if (!name) return null;
        
        const id = `${fileInfo.path}:${name}`;
        
        return {
            id,
            name,
            type: 'variable',
            file: fileInfo.path,
            kind: astPath.parent.kind, // 'var', 'let', 'const'
            exported: false, // Will be determined later
            usages: []
        };
    }
    
    /**
     * Extract import information from AST
     */
    extractImport(astPath, fileInfo) {
        const node = astPath.node;
        const source = node.source.value;
        
        const specifiers = [];
        for (const spec of node.specifiers) {
            if (spec.type === 'ImportDefaultSpecifier') {
                specifiers.push({
                    type: 'default',
                    imported: 'default',
                    local: spec.local.name
                });
            } else if (spec.type === 'ImportNamespaceSpecifier') {
                specifiers.push({
                    type: 'namespace',
                    imported: '*',
                    local: spec.local.name
                });
            } else if (spec.type === 'ImportSpecifier') {
                specifiers.push({
                    type: 'named',
                    imported: spec.imported.name,
                    local: spec.local.name
                });
            }
        }
        
        return {
            source,
            specifiers,
            isRelative: source.startsWith('.'),
            file: fileInfo.path
        };
    }
    
    /**
     * Extract export information from AST
     */
    extractExport(astPath, fileInfo) {
        const node = astPath.node;
        
        if (node.type === 'ExportDefaultDeclaration') {
            let name = 'default';
            if (node.declaration.type === 'Identifier') {
                name = node.declaration.name;
            } else if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
                name = node.declaration.id.name;
            } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
                name = node.declaration.id.name;
            }
            
            return {
                type: 'default',
                name,
                file: fileInfo.path
            };
        } else if (node.type === 'ExportNamedDeclaration') {
            const exports = [];
            
            if (node.specifiers.length > 0) {
                for (const spec of node.specifiers) {
                    exports.push({
                        type: 'named',
                        name: spec.exported.name,
                        local: spec.local.name,
                        file: fileInfo.path
                    });
                }
            }
            
            if (node.declaration) {
                if (node.declaration.type === 'FunctionDeclaration') {
                    exports.push({
                        type: 'named',
                        name: node.declaration.id.name,
                        file: fileInfo.path
                    });
                } else if (node.declaration.type === 'VariableDeclaration') {
                    for (const declarator of node.declaration.declarations) {
                        exports.push({
                            type: 'named',
                            name: declarator.id.name,
                            file: fileInfo.path
                        });
                    }
                }
            }
            
            return exports.length > 0 ? exports : null;
        }
        
        return null;
    }
    
    /**
     * Build cross-references between entities
     */
    async buildCrossReferences() {
        this.logger.log('🔗 [CODEBASE-WIKI] Building cross-references...');
        
        // Build dependency graph
        for (const [filePath, fileInfo] of this.index.files) {
            for (const importInfo of fileInfo.imports) {
                const dependencyKey = `${filePath} -> ${importInfo.source}`;
                this.index.dependencies.set(dependencyKey, {
                    from: filePath,
                    to: importInfo.source,
                    type: 'import',
                    specifiers: importInfo.specifiers
                });
            }
        }
        
        // TODO: Add usage tracking by analyzing function calls, variable references, etc.
        // This would require more complex AST traversal to find CallExpressions and Identifiers
    }
    
    /**
     * Search the codebase
     */
    search(query, options = {}) {
        const results = {
            functions: [],
            classes: [],
            variables: [],
            files: []
        };
        
        const queryLower = query.toLowerCase();
        const maxResults = options.maxResults || 20;
        
        // Search functions
        for (const [id, func] of this.index.functions) {
            if (func.name.toLowerCase().includes(queryLower)) {
                results.functions.push({
                    ...func,
                    relevance: this.calculateRelevance(func.name, query)
                });
            }
        }
        
        // Search classes
        for (const [id, cls] of this.index.classes) {
            if (cls.name.toLowerCase().includes(queryLower)) {
                results.classes.push({
                    ...cls,
                    relevance: this.calculateRelevance(cls.name, query)
                });
            }
        }
        
        // Search variables
        for (const [id, variable] of this.index.variables) {
            if (variable.name.toLowerCase().includes(queryLower)) {
                results.variables.push({
                    ...variable,
                    relevance: this.calculateRelevance(variable.name, query)
                });
            }
        }
        
        // Search files
        for (const [path, fileInfo] of this.index.files) {
            if (path.toLowerCase().includes(queryLower)) {
                results.files.push({
                    ...fileInfo,
                    relevance: this.calculateRelevance(path, query)
                });
            }
        }
        
        // Sort by relevance and limit results
        Object.keys(results).forEach(key => {
            results[key] = results[key]
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, maxResults);
        });
        
        return results;
    }
    
    /**
     * Get file statistics
     */
    getStats() {
        return {
            files: this.index.files.size,
            functions: this.index.functions.size,
            classes: this.index.classes.size,
            variables: this.index.variables.size,
            dependencies: this.index.dependencies.size,
            lastIndexed: this.index.lastIndexed,
            isIndexing: this.isIndexing
        };
    }
    
    // Helper methods
    
    clearIndex() {
        this.index.files.clear();
        this.index.functions.clear();
        this.index.classes.clear();
        this.index.variables.clear();
        this.index.imports.clear();
        this.index.dependencies.clear();
    }
    
    getLineNumber(content, position) {
        return content.substring(0, position).split('\n').length;
    }
    
    calculateComplexity(astPath) {
        let complexity = 1;
        
        astPath.traverse({
            IfStatement: () => complexity++,
            WhileStatement: () => complexity++,
            ForStatement: () => complexity++,
            ForInStatement: () => complexity++,
            ForOfStatement: () => complexity++,
            SwitchCase: (path) => {
                if (path.node.test) complexity++;
            },
            ConditionalExpression: () => complexity++,
            LogicalExpression: (path) => {
                if (path.node.operator === '&&' || path.node.operator === '||') {
                    complexity++;
                }
            }
        });
        
        return complexity;
    }
    
    calculateRelevance(text, query) {
        const textLower = text.toLowerCase();
        const queryLower = query.toLowerCase();
        
        if (textLower === queryLower) return 100;
        if (textLower.startsWith(queryLower)) return 80;
        if (textLower.includes(queryLower)) return 60;
        
        // Fuzzy matching could be added here
        return 0;
    }
    
    async saveIndex() {
        try {
            const indexFile = path.join(this.indexDir, 'index.json');
            
            // Convert Maps to Objects for JSON serialization
            const serializable = {
                files: Object.fromEntries(this.index.files),
                functions: Object.fromEntries(this.index.functions),
                classes: Object.fromEntries(this.index.classes),
                variables: Object.fromEntries(this.index.variables),
                imports: Object.fromEntries(this.index.imports),
                dependencies: Object.fromEntries(this.index.dependencies),
                lastIndexed: this.index.lastIndexed
            };
            
            await fs.writeFile(indexFile, JSON.stringify(serializable, null, 2));
            this.logger.log('💾 [CODEBASE-WIKI] Index saved to disk');
        } catch (error) {
            this.logger.error('❌ [CODEBASE-WIKI] Failed to save index:', error);
        }
    }
    
    async loadExistingIndex() {
        try {
            const indexFile = path.join(this.indexDir, 'index.json');
            const data = JSON.parse(await fs.readFile(indexFile, 'utf8'));
            
            // Convert Objects back to Maps
            this.index.files = new Map(Object.entries(data.files || {}));
            this.index.functions = new Map(Object.entries(data.functions || {}));
            this.index.classes = new Map(Object.entries(data.classes || {}));
            this.index.variables = new Map(Object.entries(data.variables || {}));
            this.index.imports = new Map(Object.entries(data.imports || {}));
            this.index.dependencies = new Map(Object.entries(data.dependencies || {}));
            this.index.lastIndexed = data.lastIndexed;
            
            this.logger.log('📚 [CODEBASE-WIKI] Existing index loaded');
        } catch (error) {
            // Index doesn't exist yet, which is fine for first run
            this.logger.log('📚 [CODEBASE-WIKI] No existing index found, starting fresh');
        }
    }
}

module.exports = CodebaseWiki;